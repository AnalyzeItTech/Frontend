'use client';

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import type { CircleLayerSpecification, HeatmapLayerSpecification, LineLayerSpecification, Map as MapLibreMap, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '../ui/ThemeProvider';
import { eventDrawWeight, strongestRows } from '../globe/dataQuality.mjs';
import { globeAtmosphere, globeBasemapTheme } from '../globe/globeVisual.mjs';
import { GLOBE_HUBS } from '../globe/sourceCatalog';
import { fullPixelRatio, miniPixelRatio } from '../globe/globePerf';
import type {
  GlobeCamera,
  GlobeDataView,
  GlobeMapHandle,
  GlobeVariant,
  MapProjectionMode,
  OverlayPath,
  SourcePoint,
} from '../globe/types';
import { ensureMapLibreWorker, isFrontFacing } from './maplibreSetup';

ensureMapLibreWorker();

export { GLOBE_HUBS };

export interface MapPlaceSelection {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
  /** When set, this is a live overlay event — not a place reverse-geocode. */
  event?: SourcePoint;
}

interface PlaceMapLibreProps {
  onPlaceSelect?: (place: MapPlaceSelection) => void;
  selected?: MapPlaceSelection | null;
  activeHub?: string | null;
  onHubSelect?: (hub: (typeof GLOBE_HUBS)[number]) => void;
  flyTo?: { lat: number; lon: number; zoom?: number } | null;
  comparePlaces?: Array<{ lat: number; lon: number; name?: string }>;
  sourcePoints?: SourcePoint[];
  overlayPaths?: OverlayPath[];
  hideNavControl?: boolean;
  hideChrome?: boolean;
  className?: string;
  onMapError?: (message: string) => void;
  onMapReady?: () => void;
  onEngineReady?: (handle: GlobeMapHandle) => void;
  variant?: GlobeVariant;
  idleDrift?: boolean;
  inFlight?: boolean;
  flyEasing?: (t: number) => number;
  initialCamera?: GlobeCamera;
  /** Stop the MapLibre render loop (parked / hidden tab). */
  paused?: boolean;
  /** Skip canvas realloc while a FLIP resize animation is in flight. */
  freezeResize?: boolean;
  /** Geographic basemap projection — globe sphere or flat mercator. */
  mapProjection?: MapProjectionMode;
  /** pins | heat | density | bars — same points, different drawing. */
  dataView?: GlobeDataView;
}

type MapConfig = {
  provider: 'locationiq' | 'openfreemap';
  theme?: string;
  mapStyle: string | StyleSpecification;
};

const OPENFREEMAP_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Slight overshoot so the camera settles instead of stopping dead. */
function easeOutBackSoft(t: number) {
  const c1 = 1.18;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function OrbitSvgOverlay({
  map,
  paths,
  mapProjection,
}: {
  map: MapLibreMap | null;
  paths: OverlayPath[];
  mapProjection: MapProjectionMode;
}) {
  const [pathD, setPathD] = useState('');

  useEffect(() => {
    if (!map || paths.length === 0) {
      setPathD('');
      return;
    }

    const redraw = () => {
      const center = map.getCenter();
      const parts: string[] = [];
      for (const path of paths) {
        let penDown = false;
        let chunk = '';
        let prevX = 0;
        for (const [lon, lat] of path.coordinates) {
          const front =
            mapProjection !== 'globe' || isFrontFacing(center.lat, center.lng, lat, lon, -0.05);
          if (!front) {
            penDown = false;
            continue;
          }
          const pt = map.project([lon, lat]);
          if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
            penDown = false;
            continue;
          }
          // Screen-space antimeridian / wrap jump
          if (penDown && Math.abs(pt.x - prevX) > map.getContainer().clientWidth * 0.45) {
            penDown = false;
          }
          chunk += penDown ? `L${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          prevX = pt.x;
          penDown = true;
        }
        if (chunk) parts.push(chunk);
      }
      setPathD(parts.join(''));
    };

    redraw();
    map.on('move', redraw);
    map.on('resize', redraw);
    return () => {
      map.off('move', redraw);
      map.off('resize', redraw);
    };
  }, [map, mapProjection, paths]);

  if (!pathD) return null;
  return (
    <svg
      className="globe-orbit-svg pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke="#f43f5e"
        strokeWidth={3.5}
        strokeOpacity={0.95}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke="#fda4af"
        strokeWidth={1.25}
        strokeOpacity={0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function flyEase(t: number) {
  if (t < 0.82) return easeInOutCubic(t / 0.82) * 0.97;
  return 0.97 + easeOutBackSoft((t - 0.82) / 0.18) * 0.03;
}

function AircraftIcon({ category, trackDeg }: { category?: string; trackDeg?: number }) {
  const cat = category || 'unknown';
  const rot = trackDeg != null && Number.isFinite(trackDeg) ? trackDeg : 0;
  // Simple top-down silhouettes by category
  if (cat === 'heli') {
    return (
      <svg className="globe-ac-icon globe-ac-icon--heli" viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${rot}deg)` }}>
        <ellipse cx="12" cy="13" rx="3.2" ry="4.5" fill="currentColor" />
        <rect x="2" y="11.2" width="20" height="1.6" rx="0.8" fill="currentColor" opacity="0.9" />
        <rect x="11.2" y="17" width="1.6" height="4" rx="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (cat === 'heavy' || cat === 'airliner') {
    return (
      <svg className={`globe-ac-icon globe-ac-icon--${cat}`} viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${rot}deg)` }}>
        <path
          fill="currentColor"
          d="M12 2.5c.6 0 1.1.3 1.3.8l1.2 3.2 6.3 3.1c.7.3.7 1.3 0 1.6l-6.3 2.4-.4 5.4 2.4 1.6v1.4l-4.5-1.2L8 21.9v-1.4l2.4-1.6-.4-5.4-6.3-2.4c-.7-.3-.7-1.3 0-1.6l6.3-3.1L11 3.3c.2-.5.7-.8 1-.8z"
        />
      </svg>
    );
  }
  if (cat === 'jet') {
    return (
      <svg className="globe-ac-icon globe-ac-icon--jet" viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${rot}deg)` }}>
        <path fill="currentColor" d="M12 3l2 6 7 2-7 2-2 8-2-8-7-2 7-2z" />
      </svg>
    );
  }
  // light / uav / unknown — compact plane
  return (
    <svg className={`globe-ac-icon globe-ac-icon--${cat}`} viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${rot}deg)` }}>
      <path
        fill="currentColor"
        d="M12 3.2c.45 0 .8.25.95.65L14 7.5l5.8 2.2c.55.2.55.95 0 1.15L14 13l-.8 5.6 2 1.2v1.1L12 19.7 8.8 21v-1.1l2-1.2L10 13 4.2 10.85c-.55-.2-.55-.95 0-1.15L10 7.5l1.05-3.65c.15-.4.5-.65.95-.65z"
      />
    </svg>
  );
}

function EventMarker({
  point,
  selected,
}: {
  point: SourcePoint;
  selected?: boolean;
}) {
  const host = point.host || 'event';
  const isFlight = host === 'flights';
  const isSat = host === 'iss';
  const isIssNow = isSat && (point.meta?.type === 'iss' || point.id.includes('iss-now'));
  return (
    <button
      type="button"
      title={point.label}
      aria-label={point.label}
      className={`globe-event-marker ${point.pulse ? 'globe-event-marker--pulse' : ''} ${
        selected ? 'globe-event-marker--selected' : ''
      } ${isFlight ? 'globe-event-marker--flight' : ''}`}
    >
      {isFlight ? (
        <span className={`globe-pin globe-pin--flight-icon globe-pin--${point.category || 'unknown'}`}>
          <AircraftIcon category={point.category} trackDeg={point.trackDeg} />
        </span>
      ) : (
        <span
          className={`globe-pin globe-pin--event globe-pin--${host} ${
            isSat && !isIssNow ? 'globe-pin--satellite' : ''
          } ${isIssNow ? 'globe-pin--iss-now' : ''}`}
        />
      )}
      {/* Labels only when selected — dense layers otherwise unreadably overlap. */}
      {(selected || point.showLabel === true) && !isFlight ? (
        <span className={`globe-event-label globe-event-label--${host}`}>{point.label}</span>
      ) : null}
      {isFlight && selected ? (
        <span className="globe-event-label globe-event-label--flights">{point.label}</span>
      ) : null}
    </button>
  );
}

function SourcePin({
  point,
  selected,
}: {
  point: SourcePoint;
  selected?: boolean;
}) {
  if (point.kind === 'event') {
    return <EventMarker point={point} selected={selected} />;
  }
  const size =
    point.kind === 'live'
      ? 12
      : point.kind === 'place'
        ? 11
        : point.kind === 'hub'
          ? 9
          : point.tier === 'trusted'
            ? 7
            : 5.5;
  return (
    <button
      type="button"
      title={point.host ? `${point.label} · ${point.host}` : point.label}
      aria-label={point.label}
      className={`globe-pin globe-pin--${point.kind} ${point.pulse ? 'globe-pin--pulse' : ''} ${
        selected ? 'globe-pin--selected' : ''
      }`}
      style={{ width: size, height: size }}
    />
  );
}

type PausableMap = MapLibreMap & { __origTriggerRepaint?: () => void };

function pauseMapLoop(map: MapLibreMap) {
  const m = map as PausableMap;
  try {
    map.stop();
  } catch {
    /* ignore */
  }
  if (!m.__origTriggerRepaint) {
    m.__origTriggerRepaint = map.triggerRepaint.bind(map);
    map.triggerRepaint = () => {};
  }
}

function resumeMapLoop(map: MapLibreMap) {
  const m = map as PausableMap;
  if (m.__origTriggerRepaint) {
    map.triggerRepaint = m.__origTriggerRepaint;
    m.__origTriggerRepaint = undefined;
  }
  try {
    map.triggerRepaint();
  } catch {
    /* ignore */
  }
}

const LAYER_COLOR: Record<string, string> = {
  earthquakes: '#d97706',
  disasters: '#dc2626',
  wildfires: '#ef4444',
  storms: '#6366f1',
  volcanoes: '#b45309',
  weather: '#3b82f6',
  air_quality: '#10b981',
  markets: '#8b5cf6',
  iss: '#f43f5e',
  space_weather: '#14b8a6',
  elevation: '#78716c',
  flights: '#0284c7',
};

function ensurePlaneIcon(map: MapLibreMap) {
  if (map.hasImage('globe-plane')) return;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = '#f0f9ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(4, -2);
  ctx.lineTo(12, 2);
  ctx.lineTo(4, 4);
  ctx.lineTo(2, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(-2, 12);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-12, 2);
  ctx.lineTo(-4, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const image = ctx.getImageData(0, 0, size, size);
  map.addImage('globe-plane', image, { pixelRatio: 2 });
}

/** 0–1 strength so heat, density, and bars share one scale. */
function pointMetric(p: SourcePoint): number | null {
  return eventDrawWeight(p);
}

export const PlaceMapLibre = forwardRef<GlobeMapHandle, PlaceMapLibreProps>(function PlaceMapLibre(
  {
    onPlaceSelect,
    selected,
    activeHub: _activeHub,
    onHubSelect,
    flyTo,
    comparePlaces = [],
    sourcePoints = [],
    overlayPaths = [],
    hideNavControl: _hideNavControl = false,
    hideChrome = false,
    className = '',
    onMapError,
    onMapReady,
    onEngineReady,
    variant = 'full',
    idleDrift = false,
    inFlight = false,
    flyEasing,
    initialCamera,
    paused = false,
    freezeResize = false,
    mapProjection = 'globe',
    dataView = 'pins',
  },
  ref,
) {
  const mapRef = useRef<MapRef | null>(null);
  const { theme } = useTheme();
  const appTheme = theme === 'dark' ? 'dark' : 'light';
  const basemapTheme = globeBasemapTheme({ variant, appTheme });
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [frontKeys, setFrontKeys] = useState<Set<string> | null>(null);
  const flyGenRef = useRef(0);
  const engineReadyRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    ensureMapLibreWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConfig(null);
    engineReadyRef.current = false;
    void fetch(`/api/map/config?theme=${encodeURIComponent(basemapTheme)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Map config failed');
        return res.json() as Promise<MapConfig>;
      })
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            provider: 'openfreemap',
            theme: basemapTheme,
            mapStyle: basemapTheme === 'dark' ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [basemapTheme]);

  const getMap = useCallback((): MapLibreMap | null => {
    const wrapped = mapRef.current;
    if (!wrapped) return null;
    return wrapped.getMap() as unknown as MapLibreMap;
  }, []);

  const handleClick = useCallback(
    (event: {
      lngLat: { lng: number; lat: number };
      features?: Array<{ properties?: Record<string, unknown> | null }>;
    }) => {
      const props = event.features?.[0]?.properties as
        | { id?: string; kind?: string; label?: string; host?: string }
        | undefined;
      if (props?.id) {
        if (variant === 'mini') return;
        if (props.kind === 'hub') {
          const hub = GLOBE_HUBS.find((h) => `hub:${h.name}` === props.id);
          if (hub) onHubSelect?.(hub);
          return;
        }
        const hit = sourcePoints.find((p) => p.id === props.id);
        onPlaceSelect?.({
          lat: hit?.lat ?? event.lngLat.lat,
          lon: hit?.lon ?? event.lngLat.lng,
          name: hit?.label || (typeof props.label === 'string' ? props.label : undefined),
          event: hit?.kind === 'event' ? hit : undefined,
        });
        return;
      }
      if (variant === 'mini') return;
      onPlaceSelect?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    },
    [onHubSelect, onPlaceSelect, sourcePoints, variant],
  );

  const runFlyTo = useCallback(
    (opts: { lat: number; lon: number; zoom?: number }) => {
      const map = getMap();
      if (!map) return Promise.resolve();
      const gen = ++flyGenRef.current;
      try {
        map.stop();
      } catch {
        /* ignore */
      }
      return new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled || gen !== flyGenRef.current) return;
          settled = true;
          map.off('moveend', finish);
          resolve();
        };
        map.once('moveend', finish);
        map.flyTo({
          center: [opts.lon, opts.lat],
          zoom: opts.zoom ?? Math.max(map.getZoom(), variant === 'mini' ? 2.6 : 5.2),
          speed: 0.62,
          curve: 1.62,
          easing: flyEasing || flyEase,
          essential: true,
        });
        window.setTimeout(finish, 7000);
      });
    },
    [flyEasing, getMap, variant],
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo: runFlyTo,
      resize: () => {
        if (pausedRef.current || freezeResize) return;
        getMap()?.resize();
      },
      getView: () => {
        const map = getMap();
        if (!map) {
          return initialCamera || { lat: 18, lng: 20, zoom: 1.35 };
        }
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
      },
      pause: () => {
        const map = getMap();
        if (map) pauseMapLoop(map);
      },
      resume: () => {
        const map = getMap();
        if (map) resumeMapLoop(map);
      },
    }),
    [freezeResize, getMap, initialCamera, runFlyTo],
  );

  useEffect(() => {
    const map = getMap();
    if (!map) return;
    if (paused) pauseMapLoop(map);
    else resumeMapLoop(map);
  }, [getMap, paused]);

  useEffect(() => {
    const map = getMap();
    if (!map || paused) return;
    const ratio = variant === 'mini' ? miniPixelRatio() : fullPixelRatio();
    try {
      map.setPixelRatio(ratio);
    } catch {
      /* older builds */
    }
    if (!freezeResize) map.resize();
  }, [freezeResize, getMap, paused, variant]);

  useEffect(() => {
    if (!flyTo) return;
    void runFlyTo(flyTo);
  }, [flyTo, runFlyTo]);

  useEffect(() => {
    if (!idleDrift || inFlight || paused || variant !== 'mini') return;
    const map = getMap();
    if (!map) return;
    let stopped = false;
    const spin = () => {
      if (stopped) return;
      const mapNow = getMap();
      if (!mapNow || mapNow.isMoving()) return;
      const c = mapNow.getCenter();
      mapNow.easeTo({
        center: [c.lng + 1.05, c.lat],
        duration: 9000,
        easing: (t) => t,
        essential: false,
      });
    };
    const onEnd = () => {
      if (!stopped) spin();
    };
    map.on('moveend', onEnd);
    spin();
    return () => {
      stopped = true;
      map.off('moveend', onEnd);
      try {
        (map as MapLibreMap & { stop: () => void }).stop();
      } catch {
        /* ignore */
      }
    };
  }, [getMap, idleDrift, inFlight, paused, variant]);

  const atmosphere = useMemo(
    () => globeAtmosphere({ variant, appTheme }),
    [appTheme, variant],
  );

  const applyAtmosphere = useCallback(
    (map: MapLibreMap) => {
      const globeMap = map as MapLibreMap & {
        setProjection?: (p: { type: string }) => void;
        setFog?: (fog: Record<string, unknown> | null) => void;
        setLight?: (light: Record<string, unknown>) => void;
      };
      try {
        globeMap.setProjection?.({ type: mapProjection === 'mercator' ? 'mercator' : 'globe' });
      } catch {
        /* older builds */
      }
      try {
        if (mapProjection === 'mercator') globeMap.setFog?.(null);
        else globeMap.setFog?.(atmosphere.fog);
      } catch {
        /* fog optional */
      }
      try {
        globeMap.setLight?.(atmosphere.light);
      } catch {
        /* light optional */
      }
    },
    [atmosphere, mapProjection],
  );

  useEffect(() => {
    const map = getMap();
    if (!map) return;
    applyAtmosphere(map);
  }, [applyAtmosphere, getMap, mapProjection]);

  // Cull far-side HTML markers so Sydney isn't clickable while facing Mexico
  useEffect(() => {
    const map = mapInstance || getMap();
    if (!map) return;

    const updateFacing = () => {
      if (mapProjection !== 'globe') {
        setFrontKeys(null); // null = all visible (flat map)
        return;
      }
      const c = map.getCenter();
      const next = new Set<string>();
      for (const hub of GLOBE_HUBS) {
        if (isFrontFacing(c.lat, c.lng, hub.lat, hub.lon)) next.add(`hub:${hub.name}`);
      }
      for (const p of sourcePoints) {
        if (isFrontFacing(c.lat, c.lng, p.lat, p.lon)) next.add(p.id);
      }
      for (const p of comparePlaces) {
        if (isFrontFacing(c.lat, c.lng, p.lat, p.lon)) next.add(`cmp:${p.lat},${p.lon}`);
      }
      if (selected && isFrontFacing(c.lat, c.lng, selected.lat, selected.lon)) {
        next.add(`sel:${selected.lat},${selected.lon}`);
      }
      setFrontKeys(next);
    };

    updateFacing();
    map.on('move', updateFacing);
    map.on('moveend', updateFacing);
    return () => {
      map.off('move', updateFacing);
      map.off('moveend', updateFacing);
    };
  }, [comparePlaces, getMap, mapInstance, mapProjection, selected, sourcePoints]);

  const isFacing = useCallback(
    (key: string) => frontKeys == null || frontKeys.has(key),
    [frontKeys],
  );

  const pixelRatio = variant === 'mini' ? miniPixelRatio() : fullPixelRatio();

  // Hooks must run before any early return (config loads async).
  const pathGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    for (const path of overlayPaths) {
      if (!path.coordinates.length) continue;
      // Split on antimeridian jumps so the ISS track doesn't smear across the map
      let ring: Array<[number, number]> = [];
      const flush = () => {
        if (ring.length < 2) {
          ring = [];
          return;
        }
        features.push({
          type: 'Feature',
          properties: { id: path.id, color: path.color || '#f43f5e' },
          geometry: { type: 'LineString', coordinates: ring },
        });
        ring = [];
      };
      for (const coord of path.coordinates) {
        if (ring.length && Math.abs(coord[0] - ring[ring.length - 1][0]) > 180) flush();
        ring.push(coord);
      }
      flush();
    }
    return { type: 'FeatureCollection', features };
  }, [overlayPaths]);

  const liveEventGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    for (const p of sourcePoints) {
      if (p.kind !== 'event') continue;
      const host = p.host || 'event';
      features.push({
        type: 'Feature',
        properties: {
          id: p.id,
          kind: 'event',
          host,
          label: p.label,
          color: LAYER_COLOR[host] || '#EA8069',
          track: Number.isFinite(Number(p.trackDeg)) ? Number(p.trackDeg) : 0,
        },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [sourcePoints]);

  const liveEventLayer = useMemo(
    (): CircleLayerSpecification => ({
      id: 'globe-live-events',
      type: 'circle',
      source: 'globe-live-events',
      filter: ['!=', ['get', 'host'], 'flights'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3.5, 3, 5, 6, 7],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.92,
      },
    }),
    [],
  );

  const liveFlightLayer = useMemo(
    (): SymbolLayerSpecification => ({
      id: 'globe-live-flights',
      type: 'symbol',
      source: 'globe-live-events',
      filter: ['==', ['get', 'host'], 'flights'],
      layout: {
        'icon-image': 'globe-plane',
        'icon-size': 0.72,
        'icon-rotate': ['get', 'track'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    }),
    [],
  );

  const metricGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    for (const p of sourcePoints) {
      const w = pointMetric(p);
      if (w == null) continue;
      features.push({
        type: 'Feature',
        properties: { id: p.id, w, label: p.label },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [sourcePoints]);

  const heatLayer = useMemo(
    (): HeatmapLayerSpecification => ({
      id: 'globe-metric-heat',
      type: 'heatmap',
      source: 'globe-metric',
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'w'], 0, 0.05, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 6, 1.4],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 18, 4, 36, 8, 56],
        'heatmap-opacity': 0.78,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(0,0,0,0)',
          0.2,
          '#7dd3fc',
          0.45,
          '#34d399',
          0.7,
          '#fbbf24',
          1,
          '#ef4444',
        ],
      },
    }),
    [],
  );

  const densityLayer = useMemo(
    (): CircleLayerSpecification => ({
      id: 'globe-metric-density',
      type: 'circle',
      source: 'globe-metric',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'w'], 0, 10, 1, 42],
        'circle-color': '#EA8069',
        'circle-opacity': 0.28,
        'circle-blur': 0.75,
        'circle-stroke-width': 0,
      },
    }),
    [],
  );

  const barPoints = useMemo(() => {
    if (dataView !== 'bars') return [];
    const ranked = strongestRows(sourcePoints, 80) as {
      rows: Array<{ id: string; score: number }>;
    };
    const max = ranked.rows[0]?.score || 1;
    const byId = new globalThis.Map(sourcePoints.map((p) => [p.id, p]));
    return ranked.rows
      .map((row) => {
        const point = byId.get(row.id);
        if (!point) return null;
        return { point, w: row.score / max };
      })
      .filter((row): row is { point: SourcePoint; w: number } => row != null);
  }, [dataView, sourcePoints]);

  const pathLineLayer = useMemo(
    (): LineLayerSpecification => ({
      id: 'globe-overlay-paths',
      type: 'line',
      source: 'globe-overlay-paths',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#f43f5e',
        'line-width': 3.25,
        'line-opacity': 0.9,
      },
    }),
    [],
  );

  if (!config) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          variant === 'full' ? 'bg-[#07090c]' : 'bg-[var(--bg)]'
        } ${className}`}
      >
        <span
          className={`font-mono text-xs ${variant === 'full' ? 'text-[#C5CED6]' : 'text-[var(--text-muted)]'}`}
        >
          Preparing map…
        </span>
      </div>
    );
  }

  const usingLocationIq = config.provider === 'locationiq';
  const interactive = variant !== 'mini';
  const liveIds = new Set(sourcePoints.filter((p) => p.kind === 'live' || p.kind === 'place').map((p) => p.id));

  return (
    <div
      className={`globe-map-canvas absolute inset-0 h-full w-full ${
        variant === 'full' ? 'globe-map-canvas--research' : ''
      } ${className}`}
    >
      <Map
        key={`map-${basemapTheme}-${usingLocationIq ? 'liq' : 'ofm'}`}
        ref={mapRef}
        onClick={handleClick}
        mapStyle={config.mapStyle}
        initialViewState={{
          longitude: initialCamera?.lng ?? 20,
          latitude: initialCamera?.lat ?? 18,
          zoom: initialCamera?.zoom ?? 1.35,
        }}
        attributionControl={hideChrome ? false : { compact: true }}
        interactive={interactive}
        interactiveLayerIds={variant === 'full' ? ['globe-live-events', 'globe-live-flights'] : undefined}
        dragPan={interactive}
        dragRotate={interactive}
        scrollZoom={interactive}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
        keyboard={interactive}
        trackResize={!paused && !freezeResize}
        pixelRatio={pixelRatio}
        fadeDuration={variant === 'mini' ? 0 : 300}
        maxTileCacheSize={variant === 'mini' ? 48 : 180}
        renderWorldCopies={variant === 'full'}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        cursor={interactive ? 'crosshair' : 'pointer'}
        onLoad={(evt) => {
          try {
            const map = evt.target as MapLibreMap;
            setMapInstance(map);
            applyAtmosphere(map);
            try {
              map.setPixelRatio(pixelRatio);
            } catch {
              /* ignore */
            }
            if (!freezeResize) map.resize();
            if (pausedRef.current) pauseMapLoop(map);
            try {
              ensurePlaneIcon(map);
            } catch {
              /* icon optional */
            }
            onMapReady?.();
            if (!engineReadyRef.current) {
              engineReadyRef.current = true;
              onEngineReady?.({
                flyTo: runFlyTo,
                resize: () => {
                  if (pausedRef.current) return;
                  map.resize();
                },
                getView: () => {
                  const c = map.getCenter();
                  return { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
                },
                pause: () => pauseMapLoop(map),
                resume: () => resumeMapLoop(map),
              });
            }
          } catch (err) {
            onMapError?.(err instanceof Error ? err.message : 'Could not enable globe projection');
          }
        }}
        onError={(evt) => {
          const msg = String(
            (evt as { error?: { message?: string } }).error?.message || 'Map failed to load',
          );
          onMapError?.(msg);
        }}
      >
        {overlayPaths.length > 0 ? (
          <Source id="globe-overlay-paths" type="geojson" data={pathGeoJson}>
            <Layer {...pathLineLayer} />
          </Source>
        ) : null}

        {variant === 'full' && dataView === 'pins' && liveEventGeoJson.features.length > 0 ? (
          <Source id="globe-live-events" type="geojson" data={liveEventGeoJson}>
            <Layer {...liveEventLayer} />
            <Layer {...liveFlightLayer} />
          </Source>
        ) : null}

        {dataView === 'heat' || dataView === 'density' ? (
          <Source id="globe-metric" type="geojson" data={metricGeoJson}>
            {dataView === 'heat' ? <Layer {...heatLayer} /> : <Layer {...densityLayer} />}
          </Source>
        ) : null}

        {variant === 'full'
          ? GLOBE_HUBS.map((hub) => {
              const key = `hub:${hub.name}`;
              const facing = isFacing(key);
              return (
                <Marker
                  key={hub.name}
                  longitude={hub.lon}
                  latitude={hub.lat}
                  anchor="center"
                  style={{
                    pointerEvents: facing ? 'auto' : 'none',
                    opacity: facing ? 1 : 0,
                  }}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    if (!facing) return;
                    onHubSelect?.(hub);
                  }}
                >
                  <SourcePin
                    point={{
                      id: key,
                      lat: hub.lat,
                      lon: hub.lon,
                      label: hub.name,
                      kind: 'hub',
                    }}
                    selected={_activeHub === hub.name}
                  />
                </Marker>
              );
            })
          : null}

        {dataView === 'bars'
          ? barPoints.map(({ point, w }) => {
              const facing = isFacing(point.id);
              const px = 10 + Math.round(w * 52);
              return (
                <Marker
                  key={`bar-${point.id}`}
                  longitude={point.lon}
                  latitude={point.lat}
                  anchor="bottom"
                  style={{ pointerEvents: facing ? 'auto' : 'none', opacity: facing ? 1 : 0 }}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    if (variant === 'mini' || !facing) return;
                    onPlaceSelect?.({ lat: point.lat, lon: point.lon, name: point.label, event: point });
                  }}
                >
                  <span className="flex flex-col items-center" title={point.label}>
                    <span className="mb-0.5 max-w-[7rem] truncate text-[9px] font-mono text-[var(--text-primary)]">
                      {point.label}
                    </span>
                    <span
                      className="w-2.5 rounded-t-sm bg-[#EA8069] shadow-sm"
                      style={{ height: px }}
                    />
                  </span>
                </Marker>
              );
            })
          : null}

        {sourcePoints
          .filter(
            (p) =>
              p.kind !== 'hub' &&
              (dataView === 'pins' || p.kind !== 'event') &&
              !(variant === 'full' && dataView === 'pins' && p.kind === 'event'),
          )
          .map((point) => {
            const facing = isFacing(point.id);
            return (
              <Marker
                key={point.id}
                longitude={point.lon}
                latitude={point.lat}
                anchor={point.kind === 'event' ? 'bottom' : 'center'}
                style={{
                  pointerEvents: facing ? 'auto' : 'none',
                  opacity: facing ? 1 : 0,
                }}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  if (variant === 'mini' || !facing) return;
                  onPlaceSelect?.({
                    lat: point.lat,
                    lon: point.lon,
                    name: point.label,
                    event: point.kind === 'event' ? point : undefined,
                  });
                }}
              >
                <SourcePin
                  point={point}
                  selected={
                    selected?.lat === point.lat &&
                    selected?.lon === point.lon &&
                    (!selected?.name || selected.name === point.label)
                  }
                />
              </Marker>
            );
          })}

        {comparePlaces.map((p, i) => {
          const key = `cmp:${p.lat},${p.lon}`;
          const facing = isFacing(key);
          return (
            <Marker
              key={`cmp-${p.lat}-${p.lon}-${i}`}
              longitude={p.lon}
              latitude={p.lat}
              anchor="center"
              style={{
                pointerEvents: 'none',
                opacity: facing ? 1 : 0,
              }}
            >
              <span className="globe-pin globe-pin--compare" title={p.name} />
            </Marker>
          );
        })}

        {selected && !liveIds.has(`place:${selected.lat.toFixed(3)}:${selected.lon.toFixed(3)}`) ? (
          <Marker
            longitude={selected.lon}
            latitude={selected.lat}
            anchor="bottom"
            style={{
              pointerEvents: 'none',
              opacity: isFacing(`sel:${selected.lat},${selected.lon}`) ? 1 : 0,
            }}
          >
            <span className="globe-selection-pin" title={selected.name || 'Selected'} />
          </Marker>
        ) : null}
      </Map>

      <OrbitSvgOverlay map={mapInstance} paths={overlayPaths} mapProjection={mapProjection} />

      {mapProjection === 'globe' ? (
        <>
          <div className="globe-atmosphere-rim" />
          <div className="globe-sphere-shade" />
        </>
      ) : null}

      {!usingLocationIq && !hideChrome ? (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 max-w-sm -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-50/95 px-3 py-2 text-center text-[11px] text-amber-900 shadow-lg backdrop-blur dark:border-amber-400/20 dark:bg-amber-950/90 dark:text-amber-100">
          Set server-only <code className="font-mono">LOCATIONIQ_KEY</code> (not{' '}
          <code className="font-mono">NEXT_PUBLIC_*</code>) on Vercel. Showing OpenFreeMap fallback.
        </div>
      ) : null}

    </div>
  );
});

PlaceMapLibre.displayName = 'PlaceMapLibre';
