'use client';

import type { MemoryCitation } from '../../lib/memoryCitations.mjs';

/** "From your notes" chips under an answer. Each opens the passage the answer was built from, in the user's own words. */
export function MemoryCitations({ citations }: { citations: MemoryCitation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3" aria-label="Sources from your notes">
      <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">From your notes</p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c) => (
          <details key={c.key} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)] open:w-full">
            <summary className="cursor-pointer list-none font-medium transition-colors hover:text-[var(--text-primary)]">
              {c.label}
              <span className="ml-1.5 opacity-50">{c.opened ? 'read in full' : 'matched'}</span>
            </summary>
            {c.excerpt ? <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-primary)]">{c.excerpt}</p> : null}
          </details>
        ))}
      </div>
    </div>
  );
}
