'use client';

import { useMemo } from 'react';
import type { ResearchSource } from './SourceChips';
import { CATEGORY_COLOR, categoryLabel } from './SourceChips';

/** Compact provenance strip — no WebGL. The persistent globe singleton already flies these pins. */
export function sourcesToMarkers(sources: ResearchSource[]) {
  const byId = new Map<string, { id: string; lat: number; lon: number; label: string; contribution: number }>();
  for (const src of sources) {
    const lat = src.lat;
    const lon = src.lng ?? src.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const id = src.source_id || src.host || src.url || `${lat},${lon}`;
    const existing = byId.get(id);
    const add = Number(src.contribution) || 1;
    if (existing) {
      existing.contribution += add;
      continue;
    }
    byId.set(id, {
      id,
      lat,
      lon,
      label: src.title || src.host || id,
      contribution: add,
    });
  }
  return [...byId.values()];
}

export function ProvenanceGlobe({ sources }: { sources: ResearchSource[] }) {
  const markers = useMemo(() => sourcesToMarkers(sources), [sources]);
  const legend = useMemo(() => {
    const cats = new Set(sources.map((s) => s.category).filter(Boolean) as string[]);
    return [...cats];
  }, [sources]);

  if (!markers.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Sources used
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">{markers.length} queried</p>
      </div>
      {legend.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {legend.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: CATEGORY_COLOR[cat] || '#E3836C' }}
              />
              {categoryLabel(cat)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
