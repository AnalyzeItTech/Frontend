'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconGlobe,
  IconLoader2,
  IconMap2,
  IconMapPin,
  IconSatellite,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import {
  fetchPlaceContext,
  searchPlaces,
  type GeoSearchHit,
  type PlaceContext,
} from '../lib/geoApi';
import type { EarthGlobeHandle } from '../Components/3d/EarthGlobe';

const EarthGlobeBound = dynamic(
  () => import('../Components/3d/EarthGlobe').then((m) => m.EarthGlobeBound),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-2)] font-mono text-xs text-[var(--text-muted)]">
        <span className="mr-2 h-2.5 w-2.5 animate-ping rounded-full bg-[#E3836C]" />
        Initializing 3D globe…
      </div>
    ),
  },
);

const PlaceMapLibre = dynamic(
  () => import('../Components/map/PlaceMapLibre').then((m) => m.PlaceMapLibre),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-2)] text-sm text-[var(--text-muted)]">
        Loading map…
      </div>
    ),
  },
);

type ViewMode = 'globe' | 'map';

export default function GlobePage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [showSatellite, setShowSatellite] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lon: number; name?: string; country?: string } | null>(
    null,
  );
  const [context, setContext] = useState<PlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeoSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const globeRef = useRef<EarthGlobeHandle | null>(null);
  const fetchGen = useRef(0);
  const searchGen = useRef(0);

  const sendToChat = useCallback(
    (prompt: string) => {
      router.push(`/research?q=${encodeURIComponent(prompt)}`);
    },
    [router],
  );

  const loadContext = useCallback(async (lat: number, lon: number, meta?: { name?: string; country?: string }) => {
    const gen = ++fetchGen.current;
    setSelected({ lat, lon, name: meta?.name, country: meta?.country });
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlaceContext(lat, lon);
      if (gen !== fetchGen.current) return;
      setContext(data);
    } catch (err) {
      if (gen !== fetchGen.current) return;
      setContext(null);
      setError(err instanceof Error ? err.message : 'Could not load place context');
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, []);

  const pickHit = useCallback(
    (hit: GeoSearchHit) => {
      setQuery(hit.name);
      setOpen(false);
      setHits([]);
      if (viewMode === 'globe') {
        globeRef.current?.flyToLatLon(hit.lat, hit.lon, {
          name: hit.name,
          country: hit.country,
          region: hit.region,
        });
      }
      void loadContext(hit.lat, hit.lon, { name: hit.name, country: hit.country });
    },
    [loadContext, viewMode],
  );

  useEffect(() => {
    if (viewMode !== 'map') return;
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
  }, [query, viewMode]);

  // When returning to 3D with a selection, fly the camera there
  useEffect(() => {
    if (viewMode !== 'globe' || !selected) return;
    globeRef.current?.flyToLatLon(selected.lat, selected.lon, {
      name: selected.name,
      country: selected.country,
    });
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps -- only on view switch

  return (
    <AppShell active="globe" flush>
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-2)]"
        style={{ minHeight: 'calc(100dvh - 56px)' }}
      >
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => setViewMode('globe')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'globe'
                ? 'bg-[#E3836C] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <IconGlobe size={14} />
            3D Globe
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-[#E3836C] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <IconMap2 size={14} />
            Street map
          </button>
          {viewMode === 'map' ? (
            <button
              type="button"
              onClick={() => setShowSatellite((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                showSatellite
                  ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
              }`}
              title="NASA GIBS satellite overlay"
            >
              <IconSatellite size={14} />
              GIBS
            </button>
          ) : null}
        </div>

        {viewMode === 'map' ? (
          <div className="absolute left-3 top-14 z-40 w-[min(100%-1.5rem,22rem)] sm:left-4">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2 shadow-lg backdrop-blur">
                <IconSearch size={15} className="shrink-0 text-[#E3836C]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && hits[0]) {
                      e.preventDefault();
                      pickHit(hits[0]);
                    }
                  }}
                  placeholder="Search any city, country, or landmark…"
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setHits([]);
                      setOpen(false);
                    }}
                    className="text-[var(--text-muted)]"
                    aria-label="Clear search"
                  >
                    <IconX size={14} />
                  </button>
                ) : null}
                {searching ? <IconLoader2 size={14} className="animate-spin text-[#E3836C]" /> : null}
              </div>
              {open && query.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl">
                  {hits.map((hit) => (
                    <button
                      key={`${hit.name}-${hit.lat}-${hit.lon}`}
                      type="button"
                      onClick={() => pickHit(hit)}
                      className="flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                          <IconMapPin size={12} className="shrink-0 text-[#E3836C]" />
                          {hit.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">
                          {hit.display_name || `${hit.region}${hit.country ? ` · ${hit.country}` : ''}`}
                        </span>
                      </span>
                    </button>
                  ))}
                  {!searching && hits.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                      No match — click the map instead.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1">
          {viewMode === 'globe' ? (
            <EarthGlobeBound
              boundRef={globeRef}
              pageMode
              contained
              isExpanded={expanded}
              onToggleExpand={setExpanded}
              externalPlacePanel
              onPlaceSelect={(place) => {
                void loadContext(place.lat, place.lon, {
                  name: place.name,
                  country: place.country,
                });
              }}
              onSendToChat={sendToChat}
            />
          ) : (
            <PlaceMapLibre
              selected={selected}
              showSatellite={showSatellite}
              onPlaceSelect={(place) => {
                void loadContext(place.lat, place.lon);
              }}
              onMapError={(message) => setError(message)}
            />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-14 bottom-14 z-30 flex justify-start p-3 sm:max-w-md sm:p-4">
          <PlaceContextCard
            context={context}
            loading={loading}
            error={error}
            onClose={() => {
              setContext(null);
              setError(null);
              setSelected(null);
            }}
            onSendToChat={sendToChat}
          />
        </div>
      </div>
    </AppShell>
  );
}
