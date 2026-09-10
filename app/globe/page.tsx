'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconLoader2,
  IconMapPin,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import { GLOBE_HUBS } from '../Components/map/PlaceMapLibre';
import {
  fetchPlaceContext,
  searchPlaces,
  type GeoSearchHit,
  type PlaceContext,
} from '../lib/geoApi';

const PlaceMapLibre = dynamic(
  () => import('../Components/map/PlaceMapLibre').then((m) => m.PlaceMapLibre),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-2)] font-mono text-xs text-[var(--text-muted)]">
        <span className="mr-2 h-2.5 w-2.5 animate-ping rounded-full bg-[#E3836C]" />
        Loading MapLibre globe…
      </div>
    ),
  },
);

type Selected = { lat: number; lon: number; name?: string; country?: string };

export default function GlobePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const [activeHub, setActiveHub] = useState<string | null>(null);
  const [context, setContext] = useState<PlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeoSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
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

  const goTo = useCallback(
    (lat: number, lon: number, opts?: { name?: string; country?: string; zoom?: number; hub?: string | null }) => {
      setFlyTo({ lat, lon, zoom: opts?.zoom ?? 5.8 });
      setActiveHub(opts?.hub ?? null);
      void loadContext(lat, lon, { name: opts?.name, country: opts?.country });
    },
    [loadContext],
  );

  const pickHit = useCallback(
    (hit: GeoSearchHit) => {
      setQuery(hit.name);
      setOpen(false);
      setHits([]);
      goTo(hit.lat, hit.lon, {
        name: hit.name,
        country: hit.country,
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

  return (
    <AppShell active="globe" flush>
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-2)]"
        style={{ minHeight: 'calc(100dvh - 56px)' }}
      >
        <div className="absolute left-3 right-3 top-3 z-40 flex flex-col gap-2 sm:left-4 sm:right-auto sm:max-w-md">
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
                    No match — click the globe instead.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hidden max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-1.5 shadow-lg backdrop-blur sm:flex">
            <span className="shrink-0 px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#E3836C]">
              Jump
            </span>
            {GLOBE_HUBS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() =>
                  goTo(hub.lat, hub.lon, { name: hub.name, zoom: 5.5, hub: hub.name })
                }
                className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-mono whitespace-nowrap transition-colors ${
                  activeHub === hub.name
                    ? 'bg-[#E3836C] font-semibold text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <PlaceMapLibre
            selected={selected}
            flyTo={flyTo}
            activeHub={activeHub}
            onHubSelect={(hub) => goTo(hub.lat, hub.lon, { name: hub.name, zoom: 5.5, hub: hub.name })}
            onPlaceSelect={(place) => {
              setActiveHub(null);
              setFlyTo(null);
              void loadContext(place.lat, place.lon);
            }}
            onMapError={(message) => setError(message)}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] bottom-3 z-30 flex justify-start p-3 sm:max-w-md sm:p-4 sm:top-28">
          <PlaceContextCard
            context={context}
            loading={loading}
            error={error}
            onClose={() => {
              setContext(null);
              setError(null);
              setSelected(null);
              setActiveHub(null);
            }}
            onSendToChat={sendToChat}
          />
        </div>
      </div>
    </AppShell>
  );
}
