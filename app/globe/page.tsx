'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconLoader2, IconMapPin, IconSatellite, IconSearch, IconX } from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import { PlaceMapLibre } from '../Components/map/PlaceMapLibre';
import { fetchPlaceContext, searchPlaces, type GeoSearchHit, type PlaceContext } from '../lib/geoApi';

export default function GlobePage() {
  const router = useRouter();
  const [showSatellite, setShowSatellite] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lon: number } | null>(null);
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

  const loadContext = useCallback(async (lat: number, lon: number) => {
    const gen = ++fetchGen.current;
    setSelected({ lat, lon });
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
      void loadContext(hit.lat, hit.lon);
    },
    [loadContext],
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
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-2)]">
        <div className="absolute left-3 right-3 top-3 z-40 flex items-start gap-2 sm:left-4 sm:right-auto">
          <div className="relative w-full max-w-md">
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
                    {hit.feature ? (
                      <span className="shrink-0 font-mono text-[9px] uppercase text-[var(--text-muted)]">
                        {hit.feature}
                      </span>
                    ) : null}
                  </button>
                ))}
                {!searching && hits.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                    No OSM match — click the map instead.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowSatellite((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur ${
              showSatellite
                ? 'border-[#E3836C] bg-[#E3836C] text-white'
                : 'border-[var(--border)] bg-[var(--surface)]/95 text-[var(--text-secondary)]'
            }`}
            title="NASA GIBS satellite overlay"
          >
            <IconSatellite size={14} />
            GIBS
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <PlaceMapLibre
            selected={selected}
            showSatellite={showSatellite}
            onPlaceSelect={(place) => {
              void loadContext(place.lat, place.lon);
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-16 bottom-3 z-30 flex justify-start p-3 sm:p-4">
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
