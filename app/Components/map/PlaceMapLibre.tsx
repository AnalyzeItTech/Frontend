'use client';

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import type { LineLayerSpecification, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '../ui/ThemeProvider';
import { GLOBE_HUBS } from '../globe/sourceCatalog';
import { fullPixelRatio, miniPixelRatio } from '../globe/globePerf';
import type {
  GlobeCamera,
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
        <span className={`globe-pin globe-pin--event globe-pin--${host}`} />
      )}
      {point.showLabel !== false && !isFlight ? (
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
  },
  ref,
) {
  const mapRef = useRef<MapRef | null>(null);
  const { theme } = useTheme();
  const mapTheme = theme === 'dark' ? 'dark' : 'streets';
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
    void fetch(`/api/map/config?theme=${encodeURIComponent(mapTheme)}`)
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
            theme: mapTheme,
            mapStyle: mapTheme === 'dark' ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mapTheme]);

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
        onPlaceSelect?.({
          lat: event.lngLat.lat,
          lon: event.lngLat.lng,
          name: typeof props.label === 'string' ? props.label : undefined,
        });
        return;
      }
      if (variant === 'mini') return;
      onPlaceSelect?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    },
    [onHubSelect, onPlaceSelect, variant],
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

  const fog = useMemo(() => {
    const mini = variant === 'mini';
    return mapTheme === 'dark'
      ? {
          color: 'rgb(18, 28, 52)',
          'high-color': 'rgb(64, 110, 210)',
          'horizon-blend': mini ? 0.04 : 0.09,
          'space-color': 'rgb(3, 5, 14)',
          'star-intensity': mini ? 0 : 0.82,
          range: [0.5, 12],
        }
      : {
          color: 'rgb(168, 204, 236)',
          'high-color': 'rgb(56, 118, 232)',
          'horizon-blend': mini ? 0.03 : 0.07,
          'space-color': 'rgb(8, 10, 26)',
          'star-intensity': mini ? 0 : 0.58,
          range: [0.6, 10],
        };
  }, [mapTheme, variant]);

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
        else globeMap.setFog?.(fog);
      } catch {
        /* fog optional */
      }
      try {
        globeMap.setLight?.({
          anchor: 'viewport',
          color: mapTheme === 'dark' ? '#c8d4ea' : '#fff4e8',
          intensity: mapTheme === 'dark' ? 0.42 : 0.55,
          position: [1.3, 210, 35],
        });
      } catch {
        /* light optional */
      }
    },
    [fog, mapTheme, mapProjection],
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
      <div className={`absolute inset-0 flex items-center justify-center bg-[var(--bg)] ${className}`}>
        <span className="font-mono text-xs text-[var(--text-muted)]">Preparing map…</span>
      </div>
    );
  }

  const usingLocationIq = config.provider === 'locationiq';
  const interactive = variant !== 'mini';
  const liveIds = new Set(sourcePoints.filter((p) => p.kind === 'live' || p.kind === 'place').map((p) => p.id));

  return (
    <div className={`globe-map-canvas absolute inset-0 h-full w-full ${className}`}>
      <Map
        key={`map-${mapTheme}-${usingLocationIq ? 'liq' : 'ofm'}`}
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

        {variant === 'full' || variant === 'mini'
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
                    if (variant === 'mini' || !facing) return;
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

        {sourcePoints
          .filter((p) => p.kind !== 'hub')
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

      {!hideChrome ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-[var(--surface)]/90 px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] backdrop-blur">
          {usingLocationIq
            ? `LocationIQ · ${mapTheme} · ${mapProjection === 'globe' ? 'MapLibre globe' : 'flat geographic'} ·`
            : 'OpenFreeMap · MapLibre ·'}{' '}
          click anywhere
        </div>
      ) : null}
    </div>
  );
});

PlaceMapLibre.displayName = 'PlaceMapLibre';
