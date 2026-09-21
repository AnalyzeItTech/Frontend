'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCurrentLocation,
  IconLayersSubtract,
  IconLoader2,
  IconMapPin,
  IconMinus,
  IconPlus,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import { GlobeCanvas } from '../Components/globe/GlobeCanvas';
import { QueuedFlyToast } from '../Components/globe/QueuedFlyToast';
import { GLOBE_HUBS } from '../Components/globe/sourceCatalog';
import { useGlobe } from '../Components/globe/useGlobe';
import {
  fetchPlaceContext,
  searchPlaces,
  type GeoSearchHit,
  type PlaceContext,
} from '../lib/geoApi';

type Selected = { lat: number; lon: number; name?: string; country?: string };
type ComparePlace = Selected & { id: string; context?: PlaceContext | null };
type LayerId = 'weather' | 'markets' | 'custom';

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

const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'weather', label: 'Weather' },
  { id: 'markets', label: 'Markets' },
  { id: 'custom', label: 'Custom metrics' },
];
/** When these land, poll on LIVE_LAYER_POLL_MS — never inside the map render loop. */

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
  } = useGlobe();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [context, setContext] = useState<PlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeoSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    weather: false,
    markets: false,
    custom: false,
  });
  const [compare, setCompare] = useState<ComparePlace[]>([]);
  const [leftRail, setLeftRail] = useState(LEFT_DEFAULT);
  const [rightRail, setRightRail] = useState(RIGHT_DEFAULT);
  const [railsReady, setRailsReady] = useState(false);
  const fetchGen = useRef(0);
  const searchGen = useRef(0);

  const anyLayerOn = useMemo(() => Object.values(layers).some(Boolean), [layers]);

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
      void loadContext(place.lat, place.lon);
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
        className="grid w-full min-h-0 flex-1 overflow-hidden bg-[var(--surface-2)]"
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
              {LAYERS.map((layer) => {
                const on = layers[layer.id];
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setLayers((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                      on
                        ? 'border-[#EA8069]/50 bg-[#EA8069]/15 text-[#C96551]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    {layer.label}
                    <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
                      Soon
                    </span>
                  </button>
                );
              })}
            </div>
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

        <section className="relative min-w-0 bg-[var(--surface-2)]">
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
                Legend
              </p>
              <ul className="space-y-1 text-[var(--text-secondary)]">
                {LAYERS.filter((l) => layers[l.id]).map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--info,#5B8DEF)]" />
                    {l.label}
                    <span className="text-[var(--text-muted)]">· coming soon (no live overlay yet)</span>
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
          {!selected && !loading && !error ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EA8069]/12 text-[#EA8069]">
                <IconMapPin size={22} />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[var(--text-primary)]">No place selected</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  Pick a search result, hub, or map point. Detail and Ask-about-place land here.
                </p>
              </div>
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
