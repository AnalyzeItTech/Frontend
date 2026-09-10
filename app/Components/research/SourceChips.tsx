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
          className="inline-flex items-center gap-1 rounded-full border border-[#4A4238]/12 bg-[#F3EDE4]/90 px-2.5 py-1 text-[10px] text-[#6B6155]"
        >
          <span className="opacity-50">found:</span>
          <span className="font-medium">{source.host}</span>
          {source.verified ? null : <span className="opacity-40">unverified</span>}
        </a>
      ))}
    </div>
  );
}
