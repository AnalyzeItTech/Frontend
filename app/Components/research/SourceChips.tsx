'use client';

export interface ResearchSource {
  host: string;
  url?: string;
  title?: string;
  verified?: boolean;
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
          <span className="opacity-50">found:</span>
          <span className="font-medium">{source.host}</span>
          {source.verified ? null : <span className="opacity-40">unverified</span>}
        </a>
      ))}
    </div>
  );
}
