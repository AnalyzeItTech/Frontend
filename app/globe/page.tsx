'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCurrentLocation,
  IconLayersSubtract,
  IconLoader2,
  IconMap,
  IconMapPin,
  IconMinus,
  IconPlus,
  IconSearch,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import { EventDetailCard } from '../Components/map/EventDetailCard';
import { GlobeCanvas } from '../Components/globe/GlobeCanvas';
import { QueuedFlyToast } from '../Components/globe/QueuedFlyToast';
import { GLOBE_HUBS } from '../Components/globe/sourceCatalog';
import { LIVE_LAYER_POLL_MS } from '../Components/globe/globePerf';
import { useGlobe } from '../Components/globe/useGlobe';
import type { SourcePoint } from '../Components/globe/types';
import {
  fetchGlobeEvents,
  fetchPlaceContext,
  searchPlaces,
  type GeoSearchHit,
  type PlaceContext,
} from '../lib/geoApi';

type Selected = { lat: number; lon: number; name?: string; country?: string };
type ComparePlace = Selected & { id: string; context?: PlaceContext | null };
type LayerId =
  | 'catalog'
  | 'earthquakes'
  | 'wildfires'
  | 'storms'
  | 'volcanoes'
  | 'disasters'
  | 'weather'
  | 'air_quality'
  | 'markets'
  | 'flights'
  | 'iss'
  | 'elevation';

const RAIL_KEY = 'analyzeit_globe_rails';
const LEFT_DEFAULT = 280;
const RIGHT_DEFAULT = 360;
const LEFT_MIN = 200;
const LEFT_MAX = 480;
const RIGHT_MIN = 240;
const RIGHT_MAX = 560;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readRails(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(RAIL_KEY);
    if (!raw) return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
    const parsed = JSON.parse(raw) as { left?: number; right?: number };
    return {
      left: clamp(Number(parsed.left) || LEFT_DEFAULT, LEFT_MIN, LEFT_MAX),
      right: clamp(Number(parsed.right) || RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX),
    };
  } catch {
    return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
  }
}

const LAYERS: { id: LayerId; label: string; hint: string; color: string }[] = [
  { id: 'catalog', label: 'Sources', hint: 'Research HQ catalog (~90+)', color: '#c4a28a' },
  { id: 'earthquakes', label: 'Earthquakes', hint: 'USGS worldwide', color: '#d97706' },
  { id: 'disasters', label: 'Disasters', hint: 'GDACS alerts', color: '#dc2626' },
  { id: 'wildfires', label: 'Wildfires', hint: 'NASA EONET open fires', color: '#ef4444' },
  { id: 'storms', label: 'Storms', hint: 'NASA EONET severe storms', color: '#6366f1' },
  { id: 'volcanoes', label: 'Volcanoes', hint: 'NASA EONET volcanoes', color: '#b45309' },
  { id: 'weather', label: 'Weather', hint: 'Open-Meteo at hubs', color: '#3b82f6' },
  { id: 'air_quality', label: 'Air quality', hint: 'AQI at hubs', color: '#10b981' },
  { id: 'iss', label: 'Satellites', hint: 'ISS orbit + stations & bright sats', color: '#f43f5e' },
  { id: 'elevation', label: 'Elevation', hint: 'Meters above sea level at hubs', color: '#78716c' },
  { id: 'markets', label: 'Markets', hint: 'Live equity indices at hubs', color: '#8b5cf6' },
  { id: 'flights', label: 'Flights', hint: 'Live aircraft worldwide (OpenSky/ADS-B)', color: '#0ea5e9' },
];
/** Live layers: this page is the only caller of geo context/events. Poll on LIVE_LAYER_POLL_MS — never in rAF. */

function placeId(p: { lat: number; lon: number; name?: string }) {
  return `${(p.name || 'p').toLowerCase()}-${p.lat.toFixed(3)}-${p.lon.toFixed(3)}`;
}

function kpis(ctx: PlaceContext | null | undefined) {
  const temp = ctx?.weather?.temperature_c;
  const aqi = ctx?.air_quality?.us_aqi ?? ctx?.air_quality?.european_aqi;
  const market = ctx?.market?.index_symbol || ctx?.market?.index_name;
  return [
    { label: 'Temp', value: temp != null ? `${Math.round(temp)}°C` : '—' },
    { label: 'AQI', value: aqi != null ? String(aqi) : '—' },
    { label: 'Market', value: market || '—' },
  ];
}

export default function GlobePage() {
  const router = useRouter();
  const {
    flyToLatLon,
    camera,
    selectedPoint,
    mapReady,
    setOnMapPlaceSelect,
    setComparePlaces,
    setActiveHub,
    activeHub,
    setOverlayPoints,
    setOverlayPaths,
    setShowCatalog,
    mapProjection,
    setMapProjection,
  } = useGlobe();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SourcePoint | null>(null);
  const [context, setContext] = useState<PlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState('');
  const [hits, setHits] = useState<GeoSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    catalog: true,
    earthquakes: true,
    disasters: false,
    wildfires: false,
    storms: false,
    volcanoes: false,
    weather: false,
    air_quality: false,
    markets: false,
    flights: false,
    iss: false,
    elevation: false,
  });
  const [layerCounts, setLayerCounts] = useState<Partial<Record<LayerId, number>>>({});
  const [layersLoading, setLayersLoading] = useState(false);
  const [compare, setCompare] = useState<ComparePlace[]>([]);
  const [leftRail, setLeftRail] = useState(LEFT_DEFAULT);
  const [rightRail, setRightRail] = useState(RIGHT_DEFAULT);
  const [railsReady, setRailsReady] = useState(false);
  const fetchGen = useRef(0);
  const searchGen = useRef(0);

  const anyLayerOn = useMemo(() => Object.values(layers).some(Boolean), [layers]);
  const visibleLayers = useMemo(() => {
    const q = layerFilter.trim().toLowerCase();
    if (!q) return LAYERS;
    return LAYERS.filter(
      (l) => l.label.toLowerCase().includes(q) || l.hint.toLowerCase().includes(q) || l.id.includes(q),
    );
  }, [layerFilter]);

  useEffect(() => {
    setShowCatalog(Boolean(layers.catalog));
  }, [layers.catalog, setShowCatalog]);

  useEffect(() => {
    let cancelled = false;
    const liveIds = (
      [
        'earthquakes',
        'disasters',
        'wildfires',
        'storms',
        'volcanoes',
        'weather',
        'air_quality',
        'markets',
        'flights',
        'iss',
        'elevation',
      ] as LayerId[]
    ).filter((id) => layers[id]);

    const buildOverlays = async () => {
      const points: SourcePoint[] = [];
      const counts: Partial<Record<LayerId, number>> = {};

      if (liveIds.length === 0) {
        if (!cancelled) {
          setLayerCounts({});
          setOverlayPoints([]);
          setOverlayPaths([]);
          setLayersLoading(false);
        }
        return;
      }

      setLayersLoading(true);
      try {
        const data = await fetchGlobeEvents({
          layers: liveIds,
          minMagnitude: 4.5,
          days: 7,
        });
        if (cancelled) return;

        const pushEvents = (
          layerId: LayerId,
          events: Array<{
            id?: string;
            lat?: number;
            lon?: number;
            place?: string;
            label?: string;
            mag?: number;
            type?: string;
            temperature_c?: number;
            callsign?: string | null;
            altitude_m?: number | null;
            velocity_ms?: number | null;
            track_deg?: number | null;
            category?: string;
            icao?: string | null;
            typecode?: string | null;
            registration?: string | null;
            altitude_km?: number | null;
            velocity_kms?: number | null;
            norad_id?: number | null;
            name?: string | null;
            group?: string | null;
            hub?: string | null;
          }>,
          opts?: { pulseMag?: number; host: string },
        ) => {
          let n = 0;
          for (const ev of events) {
            if (ev.lat == null || ev.lon == null) continue;
            const mag = ev.mag != null ? Number(ev.mag) : null;
            const label =
              ev.label ||
              (mag != null
                ? `M${mag.toFixed(1)} · ${ev.place || layerId}`
                : ev.place || layerId);
            const host = opts?.host || layerId;
            points.push({
              id: `${layerId}:${ev.id || `${ev.lat},${ev.lon}`}`,
              lat: ev.lat,
              lon: ev.lon,
              label,
              kind: 'event',
              host,
              pulse: opts?.pulseMag != null && mag != null && mag >= opts.pulseMag,
              showLabel:
                host === 'iss'
                  ? ev.type === 'iss' || Boolean(ev.norad_id === 25544)
                  : host !== 'flights',
              category: ev.category,
              trackDeg: ev.track_deg != null ? Number(ev.track_deg) : undefined,
              meta: {
                type: ev.type,
                callsign: ev.callsign,
                altitude_m: ev.altitude_m,
                velocity_ms: ev.velocity_ms,
                track_deg: ev.track_deg,
                category: ev.category,
                icao: ev.icao,
                typecode: ev.typecode,
                registration: ev.registration,
                altitude_km: ev.altitude_km,
                velocity_kms: ev.velocity_kms,
                norad_id: ev.norad_id,
                name: ev.name || ev.place,
                group: ev.group,
                hub: ev.hub,
                place: ev.place,
              },
            });
            n += 1;
          }
          counts[layerId] = n;
        };

        const paths: import('../Components/globe/types').OverlayPath[] = [];

        if (layers.earthquakes) {
          pushEvents('earthquakes', data.layers.earthquakes?.events || [], {
            host: 'earthquakes',
            pulseMag: 6,
          });
        }
        if (layers.disasters) {
          pushEvents('disasters', data.layers.disasters?.events || [], { host: 'disasters' });
        }
        if (layers.wildfires) {
          pushEvents('wildfires', data.layers.wildfires?.events || [], { host: 'wildfires' });
        }
        if (layers.storms) {
          pushEvents('storms', data.layers.storms?.events || [], { host: 'storms' });
        }
        if (layers.volcanoes) {
          pushEvents('volcanoes', data.layers.volcanoes?.events || [], { host: 'volcanoes' });
        }
        if (layers.weather) {
          pushEvents('weather', data.layers.weather?.events || [], { host: 'weather' });
        }
        if (layers.air_quality) {
          pushEvents('air_quality', data.layers.air_quality?.events || [], { host: 'air_quality' });
        }
        if (layers.markets) {
          pushEvents('markets', data.layers.markets?.events || [], { host: 'markets' });
        }
        if (layers.flights) {
          pushEvents('flights', data.layers.flights?.events || [], { host: 'flights' });
        }
        if (layers.iss) {
          pushEvents('iss', data.layers.iss?.events || [], { host: 'iss' });
          const rawPath = data.layers.iss?.path || [];
          if (rawPath.length >= 2) {
            paths.push({
              id: 'iss-orbit',
              color: '#f43f5e',
              coordinates: rawPath
                .filter((p) => p.lat != null && p.lon != null)
                .map((p) => [Number(p.lon), Number(p.lat)] as [number, number]),
            });
          }
        }
        if (layers.elevation) {
          pushEvents('elevation', data.layers.elevation?.events || [], { host: 'elevation' });
        }

        // Place-context extras intentionally not mixed into globe overlays —
        // selecting a place must not rebuild/wipe live flight & satellite pins.

        setLayerCounts(counts);
        setOverlayPoints(points);
        setOverlayPaths(paths);
      } catch {
        // Keep last good overlays on transient fetch failure
        if (!cancelled) setLayersLoading(false);
      } finally {
        if (!cancelled) setLayersLoading(false);
      }
    };

    void buildOverlays();
    const timer = window.setInterval(() => {
      void buildOverlays();
    }, LIVE_LAYER_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [layers, setOverlayPoints, setOverlayPaths]);

  useEffect(() => {
    return () => {
      setOverlayPoints([]);
      setOverlayPaths([]);
      setShowCatalog(true);
    };
  }, [setOverlayPoints, setOverlayPaths, setShowCatalog]);

  const sendToResearch = useCallback(
    (prompt: string, places?: Selected[]) => {
      const list = places?.length ? places : selected ? [selected] : [];
      const labels = list
        .map((p) => p.name || `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)
        .join(' · ');
      const ids = list.map((p) => `${p.lat},${p.lon}`).join('|');
      const qs = new URLSearchParams();
      qs.set('q', prompt || (labels ? `Analyze ${labels}` : 'Analyze this place'));
      if (labels) qs.set('place', labels);
      if (ids) qs.set('placeIds', ids);
      router.push(`/research?${qs.toString()}`);
    },
    [router, selected],
  );

  const loadContext = useCallback(
    async (lat: number, lon: number, meta?: { name?: string; country?: string }) => {
      const gen = ++fetchGen.current;
      setSelectedEvent(null);
      setSelected({ lat, lon, name: meta?.name, country: meta?.country });
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPlaceContext(lat, lon);
        if (gen !== fetchGen.current) return;
        setContext(data);
        const name = meta?.name || data.place?.name || undefined;
        const country = meta?.country || data.place?.country || undefined;
        if (name || country) {
          setSelected((prev) =>
            prev && prev.lat === lat && prev.lon === lon
              ? { ...prev, name: name || prev.name, country: country || prev.country }
              : prev,
          );
        }
      } catch (err) {
        if (gen !== fetchGen.current) return;
        setContext(null);
        setError(err instanceof Error ? err.message : 'Could not load place context');
      } finally {
        if (gen === fetchGen.current) setLoading(false);
      }
    },
    [],
  );

  const goTo = useCallback(
    (
      lat: number,
      lon: number,
      opts?: { name?: string; country?: string; zoom?: number; hub?: string | null },
    ) => {
      flyToLatLon(lat, lon, {
        zoom: opts?.zoom ?? 5.8,
        name: opts?.name,
        country: opts?.country,
        hub: opts?.hub ?? null,
        user: true,
      });
      void loadContext(lat, lon, { name: opts?.name, country: opts?.country });
    },
    [flyToLatLon, loadContext],
  );

  const pickHit = useCallback(
    (hit: GeoSearchHit) => {
      setQuery(hit.name);
      setHits([]);
      goTo(hit.lat, hit.lon, {
        name: hit.name,
        country: hit.country || undefined,
        zoom: 6.5,
        hub: null,
      });
    },
    [goTo],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const gen = ++searchGen.current;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchPlaces(q, 8)
        .then((rows) => {
          if (gen !== searchGen.current) return;
          setHits(rows);
        })
        .catch(() => {
          if (gen !== searchGen.current) return;
          setHits([]);
        })
        .finally(() => {
          if (gen === searchGen.current) setSearching(false);
        });
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const toggleCompare = useCallback(() => {
    if (!selected) return;
    const id = placeId(selected);
    setCompare((prev) => {
      if (prev.some((p) => p.id === id)) return prev.filter((p) => p.id !== id);
      if (prev.length >= 3) return prev;
      return [...prev, { ...selected, id, context }];
    });
  }, [selected, context]);

  useEffect(() => {
    if (!selected || !context) return;
    const id = placeId(selected);
    setCompare((prev) =>
      prev.map((p) => (p.id === id ? { ...p, context, name: selected.name || p.name } : p)),
    );
  }, [selected, context]);

  useEffect(() => {
    setComparePlaces(compare.map((p) => ({ lat: p.lat, lon: p.lon, name: p.name })));
  }, [compare, setComparePlaces]);

  useEffect(() => {
    setOnMapPlaceSelect((place) => {
      setActiveHub(null);
      if (place.event) {
        setSelectedEvent(place.event);
        setSelected({ lat: place.lat, lon: place.lon, name: place.name });
        setContext(null);
        setError(null);
        setLoading(false);
        return;
      }
      setSelectedEvent(null);
      void loadContext(place.lat, place.lon, { name: place.name });
    });
    return () => setOnMapPlaceSelect(null);
  }, [loadContext, setActiveHub, setOnMapPlaceSelect]);

  const hydratedFromChat = useRef(false);
  useEffect(() => {
    if (hydratedFromChat.current || !selectedPoint) return;
    hydratedFromChat.current = true;
    void loadContext(selectedPoint.lat, selectedPoint.lon, { name: selectedPoint.label });
  }, [loadContext, selectedPoint]);

  const askAboutPlace = useCallback(() => {
    if (context?.chat_prompt) {
      sendToResearch(context.chat_prompt, selected ? [selected] : undefined);
      return;
    }
    if (!selected) return;
    const label = selected.name || `${selected.lat.toFixed(2)}°, ${selected.lon.toFixed(2)}°`;
    sendToResearch(
      `Ask about this place: ${label}${selected.country ? ` (${selected.country})` : ''}. Summarize signals, risks, and what to watch.`,
      [selected],
    );
  }, [context, selected, sendToResearch]);

  const askCompare = useCallback(() => {
    if (compare.length < 2) return;
    const labels = compare.map((p) => p.name || `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`);
    sendToResearch(
      `Compare these places side by side: ${labels.join(' vs ')}. Call out weather, air quality, market, and notable differences.`,
      compare,
    );
  }, [compare, sendToResearch]);

  useEffect(() => {
    const rails = readRails();
    setLeftRail(rails.left);
    setRightRail(rails.right);
    setRailsReady(true);
  }, []);

  useEffect(() => {
    if (!railsReady) return;
    try {
      localStorage.setItem(RAIL_KEY, JSON.stringify({ left: leftRail, right: rightRail }));
    } catch {
      /* ignore */
    }
  }, [leftRail, rightRail, railsReady]);

  const startResize = useCallback((side: 'left' | 'right', ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const startX = ev.clientX;
    const start = side === 'left' ? leftRail : rightRail;
    const target = ev.currentTarget;
    target.setPointerCapture(ev.pointerId);
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      if (side === 'left') setLeftRail(clamp(start + dx, LEFT_MIN, LEFT_MAX));
      else setRightRail(clamp(start - dx, RIGHT_MIN, RIGHT_MAX));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [leftRail, rightRail]);

  const inCompare = selected ? compare.some((p) => p.id === placeId(selected)) : false;

  return (
    <AppShell active="globe" flush>
      <div
        className="grid w-full min-h-0 flex-1 overflow-hidden bg-[var(--bg)]"
        style={{
          minHeight: 'calc(100dvh - var(--nav-h, 56px))',
          gridTemplateColumns: `${leftRail}px 8px minmax(0, 1fr) 8px ${rightRail}px`,
        }}
      >
        <aside className="flex min-w-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]">
          <div className="space-y-3 border-b border-[var(--border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Drag edges to widen
              </p>
              <button
                type="button"
                className="text-[10px] text-[var(--text-muted)] underline underline-offset-2"
                onClick={() => {
                  setLeftRail(LEFT_DEFAULT);
                  setRightRail(RIGHT_DEFAULT);
                }}
              >
                Reset width
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
              <IconSearch size={15} className="shrink-0 text-[#EA8069]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hits[0]) {
                    e.preventDefault();
                    pickHit(hits[0]);
                  }
                }}
                placeholder="Place, metric, weather…"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                aria-label="Search places"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHits([]);
                  }}
                  className="flex h-8 w-8 items-center justify-center text-[var(--text-muted)]"
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </button>
              ) : null}
              {searching ? <IconLoader2 size={14} className="animate-spin text-[#EA8069]" /> : null}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => {
                  if (!selected) {
                    flyToLatLon(20, 0, { zoom: 3, user: true });
                    return;
                  }
                  flyToLatLon(selected.lat, selected.lon, {
                    zoom: Math.min(camera.zoom + 1, 12),
                    name: selected.name,
                    user: true,
                  });
                }}
              >
                <IconPlus size={14} />
              </button>
              <button
                type="button"
                className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => {
                  if (!selected) {
                    flyToLatLon(20, 0, { zoom: 1.6, user: true });
                    return;
                  }
                  flyToLatLon(selected.lat, selected.lon, {
                    zoom: Math.max(camera.zoom - 1, 1.4),
                    name: selected.name,
                    user: true,
                  });
                }}
              >
                <IconMinus size={14} />
              </button>
              <button
                type="button"
                className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                title="Locate selection"
                aria-label="Locate selection"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  flyToLatLon(selected.lat, selected.lon, {
                    zoom: 6.5,
                    name: selected.name,
                    user: true,
                  });
                }}
              >
                <IconCurrentLocation size={14} />
              </button>
              <div className="ml-auto flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <IconLayersSubtract size={12} />
                Layers
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMapProjection(mapProjection === 'globe' ? 'mercator' : 'globe')}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                title={mapProjection === 'globe' ? 'Switch to flat geographic map' : 'Switch to 3D globe'}
              >
                {mapProjection === 'globe' ? <IconWorld size={12} /> : <IconMap size={12} />}
                {mapProjection === 'globe' ? 'Globe view' : 'Geographic map'}
              </button>
            </div>

            <label className="relative block">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                placeholder="Filter layers…"
                className="h-8 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[#EA8069]/50"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {visibleLayers.map((layer) => {
                const on = layers[layer.id];
                return (
                  <button
                    key={layer.id}
                    type="button"
                    title={layer.hint}
                    onClick={() => setLayers((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                      on
                        ? 'border-[#EA8069]/50 bg-[#EA8069]/15 text-[#C96551]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    {layer.label}
                    {on && (layerCounts[layer.id] ?? 0) > 0 ? (
                      <span className="rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-[9px] tabular-nums text-[var(--text-muted)]">
                        {layerCounts[layer.id]}
                      </span>
                    ) : null}
                    {on && layersLoading ? (
                      <IconLoader2 size={11} className="animate-spin text-[var(--text-muted)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {layerFilter.trim() && visibleLayers.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">No layers match that filter.</p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {query.trim().length >= 2 ? (
              <div className="space-y-1">
                <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Results
                </p>
                {searching && hits.length === 0 ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
                    ))}
                  </div>
                ) : null}
                {hits.map((hit) => (
                  <button
                    key={`${hit.name}-${hit.lat}-${hit.lon}`}
                    type="button"
                    onClick={() => pickHit(hit)}
                    className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
                  >
                    <IconMapPin size={14} className="mt-0.5 shrink-0 text-[#EA8069]" />
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--text-primary)]">{hit.name}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                        {hit.display_name ||
                          `${hit.region || ''}${hit.country ? ` · ${hit.country}` : ''}`}
                      </span>
                    </span>
                  </button>
                ))}
                {!searching && hits.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-[var(--text-muted)]">
                    No match — click the map instead.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Hubs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GLOBE_HUBS.map((hub) => (
                      <button
                        key={hub.name}
                        type="button"
                        onClick={() =>
                          goTo(hub.lat, hub.lon, { name: hub.name, zoom: 5.5, hub: hub.name })
                        }
                        className={`min-h-8 whitespace-nowrap rounded-full px-3 text-xs transition-colors ${
                          activeHub === hub.name
                            ? 'bg-[#EA8069] font-semibold text-white'
                            : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        {hub.name}
                      </button>
                    ))}
                  </div>
                </div>
                {compare.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Compare ({compare.length}/3)
                    </p>
                    <div className="space-y-1">
                      {compare.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-2.5 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate font-medium text-[var(--text-primary)]">
                            {p.name || `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`}
                          </span>
                          <button
                            type="button"
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label={`Remove ${p.name || 'place'}`}
                            onClick={() => setCompare((prev) => prev.filter((x) => x.id !== p.id))}
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Search a place to begin — or jump a hub, then add up to three places to compare.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize search panel"
          tabIndex={0}
          onPointerDown={(e) => startResize('left', e)}
          onDoubleClick={() => setLeftRail(LEFT_DEFAULT)}
          className="z-10 cursor-col-resize bg-[var(--border)] hover:bg-[#EA8069]"
        />

        <section className="relative min-w-0 bg-[var(--bg)]">
          <div className="absolute inset-0">
            <GlobeCanvas variant="full" />
          </div>
          <QueuedFlyToast />

          {!selected && mapReady ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-center shadow-lg backdrop-blur">
                <p className="font-serif text-sm text-[var(--text-primary)]">Search a place to begin</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Or click anywhere on the globe
                </p>
              </div>
            </div>
          ) : null}

          {anyLayerOn ? (
            <div className="absolute bottom-3 left-3 z-20 max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-3 text-[11px] shadow-lg backdrop-blur">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Active layers · {mapProjection === 'globe' ? '3D globe' : 'flat map'}
              </p>
              <ul className="space-y-1 text-[var(--text-secondary)]">
                {LAYERS.filter((l) => layers[l.id]).map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                    {l.label}
                    <span className="text-[var(--text-muted)]">· {l.hint}</span>
                    {(layerCounts[l.id] ?? 0) > 0 ? (
                      <span className="tabular-nums text-[var(--text-muted)]">({layerCounts[l.id]})</span>
                    ) : layersLoading ? (
                      <span className="text-[var(--text-muted)]">…</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">(0)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!mapReady ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-[var(--surface)]/40">
              <div className="h-full w-1/3 animate-pulse bg-[#EA8069]/70" />
            </div>
          ) : null}
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize place panel"
          tabIndex={0}
          onPointerDown={(e) => startResize('right', e)}
          onDoubleClick={() => setRightRail(RIGHT_DEFAULT)}
          className="z-10 cursor-col-resize bg-[var(--border)] hover:bg-[#EA8069]"
        />

        <aside className="flex min-w-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)]">
          {!selected && !selectedEvent && !loading && !error ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EA8069]/12 text-[#EA8069]">
                <IconMapPin size={22} />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[var(--text-primary)]">No place selected</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  Pick a search result, hub, map point, flight, or satellite. Details land here.
                </p>
              </div>
            </div>
          ) : selectedEvent ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <EventDetailCard
                point={selectedEvent}
                onClose={() => {
                  setSelectedEvent(null);
                  setSelected(null);
                }}
              />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PlaceContextCard
                  context={context}
                  loading={loading}
                  error={error}
                  rail
                  onClose={() => {
                    setContext(null);
                    setError(null);
                    setSelected(null);
                    setSelectedEvent(null);
                    setActiveHub(null);
                  }}
                  onSendToChat={(prompt) => sendToResearch(prompt, selected ? [selected] : undefined)}
                />
              </div>

              <div className="space-y-2 border-t border-[var(--border)] p-3">
                {compare.length >= 2 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                    <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Compare KPIs
                    </p>
                    <div className="grid gap-2">
                      {compare.map((p) => (
                        <div key={p.id} className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
                          <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                            {p.name || `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {kpis(p.context).map((k) => (
                              <span
                                key={k.label}
                                className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                              >
                                {k.label} {k.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={askCompare}
                      className="btn-secondary mt-2 min-h-8 w-full text-xs"
                    >
                      Ask Research to compare
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!selected}
                  onClick={toggleCompare}
                  className="btn-secondary min-h-8 w-full text-xs disabled:opacity-50"
                >
                  {inCompare ? 'Remove from compare' : 'Add to compare'}
                </button>
                <button
                  type="button"
                  disabled={!selected && !context}
                  onClick={askAboutPlace}
                  className="btn-primary flex min-h-10 w-full items-center justify-center gap-1.5 text-sm disabled:opacity-50"
                >
                  Ask about this place
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
