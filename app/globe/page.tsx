'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { IconGlobe, IconMap2, IconSatellite } from '@tabler/icons-react';
import { AppShell } from '../Components/app/AppShell';
import { PlaceContextCard } from '../Components/map/PlaceContextCard';
import { PlaceMapLibre } from '../Components/map/PlaceMapLibre';
import { fetchPlaceContext, type PlaceContext } from '../lib/geoApi';
import type { EarthGlobeHandle } from '../Components/3d/EarthGlobe';

const EarthGlobeBound = dynamic(
  () => import('../Components/3d/EarthGlobe').then((module) => module.EarthGlobeBound),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[var(--surface-2)]" /> },
);

type ViewMode = 'globe' | 'map';

export default function GlobePage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [showSatelliteHint, setShowSatelliteHint] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lon: number } | null>(null);
  const [context, setContext] = useState<PlaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const globeRef = useRef<EarthGlobeHandle | null>(null);
  const fetchGen = useRef(0);

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

  return (
    <AppShell active="globe" flush>
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-2)]">
        <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 p-1 shadow-lg backdrop-blur">
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
            MapLibre
          </button>
          {viewMode === 'map' ? (
            <button
              type="button"
              onClick={() => setShowSatelliteHint((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                showSatelliteHint
                  ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
              }`}
              title="NASA GIBS satellite imagery is available as a free overlay source"
            >
              <IconSatellite size={14} />
              GIBS
            </button>
          ) : null}
        </div>

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
                void loadContext(place.lat, place.lon);
              }}
              onSendToChat={sendToChat}
            />
          ) : (
            <PlaceMapLibre
              selected={selected}
              showSatellite={showSatelliteHint}
              onPlaceSelect={(place) => {
                void loadContext(place.lat, place.lon);
              }}
            />
          )}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex justify-start sm:max-w-md">
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

        {showSatelliteHint && viewMode === 'map' ? (
          <div className="absolute right-4 top-14 z-30 max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] text-[var(--text-secondary)] shadow-lg">
            <strong className="text-[var(--text-primary)]">NASA GIBS</strong> True Color tiles are free and
            keyless. Base map remains OpenFreeMap (OSM). Toggle off when not needed for clearer labels.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
