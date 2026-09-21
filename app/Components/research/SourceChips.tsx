'use client';

export interface ResearchSource {
  host: string;
  url?: string;
  title?: string;
  verified?: boolean;
  source_id?: string;
  category?: string;
  lat?: number;
  lng?: number;
  lon?: number;
  contribution?: number;
}

export const CATEGORY_COLOR: Record<string, string> = {
  geo_live: '#EA8069',
  stats: '#6366f1',
  archives: '#ca8a04',
  science: '#0d9488',
  maps: '#2563eb',
  culture: '#a855f7',
  media: '#db2777',
};

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    geo_live: 'live geo',
    stats: 'stats',
    archives: 'archives',
    science: 'science',
    maps: 'maps',
    culture: 'culture',
    media: 'media',
  };
  return labels[category] || category;
}

export function SourceChips({ sources }: { sources: ResearchSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <a
          key={source.url || source.host}
          href={source.url || `https://${source.host}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[#E3836C]/40 hover:text-[var(--text-primary)]"
        >
          {source.category ? (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CATEGORY_COLOR[source.category] || '#E3836C' }}
            />
          ) : (
            <span className="opacity-50">found:</span>
          )}
          <span className="font-medium">{source.host}</span>
          {source.verified ? null : <span className="opacity-40">unverified</span>}
        </a>
      ))}
    </div>
  );
}
