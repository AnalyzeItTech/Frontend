'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import { describeSource } from '../../lib/memorySourceRow.mjs';
import { getMemoryWarnings, listMemorySources, type MemorySource } from '../../lib/memoryApi';

/** Cap for the dashboard preview — Backend supports ?limit= on retention/sources. */
const SOURCE_LIMIT = 5;
const PREVIEW_ROWS = 3;

/**
 * Signed-in dashboard card: recent retained sources + optional capacity warnings.
 * Uses existing retention APIs only; no join/toggle CTAs.
 */
export function MemoryHomeCard() {
  const [authed, setAuthed] = useState(false);
  const [sources, setSources] = useState<MemorySource[] | null>(null);
  const [warn, setWarn] = useState<{ stored: string | null; hot: string | null }>({
    stored: null,
    hot: null,
  });

  useEffect(() => {
    if (!getStoredToken()) {
      setAuthed(false);
      setSources(null);
      return;
    }
    setAuthed(true);
    let cancelled = false;
    Promise.all([listMemorySources('', SOURCE_LIMIT), getMemoryWarnings()])
      .then(([rows, warnings]) => {
        if (cancelled) return;
        setSources(rows);
        setWarn(warnings);
      })
      .catch(() => {
        if (!cancelled) setSources(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authed || sources === null) return null;

  const capped = sources.length >= SOURCE_LIMIT;
  const countLabel = capped
    ? `${SOURCE_LIMIT}+ sources`
    : `${sources.length} source${sources.length === 1 ? '' : 's'}`;
  const preview = sources.slice(0, PREVIEW_ROWS);

  return (
    <section
      aria-label="What AnalyzeIt remembers"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-4 py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            What AnalyzeIt remembers
          </p>
          <p className="text-sm text-[var(--text-primary)]">{countLabel}</p>
        </div>
        <Link
          href="/memory"
          className="shrink-0 text-xs underline underline-offset-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Manage memory
        </Link>
      </div>

      {warn.stored || warn.hot ? (
        <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]" role="status">
          {warn.stored ? <p>{warn.stored}</p> : null}
          {warn.hot ? <p>{warn.hot}</p> : null}
        </div>
      ) : null}

      {preview.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
          {preview.map((row) => {
            const d = describeSource(row);
            return (
              <li key={row.id} className="min-w-0 text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{d.heading}</span>
                {d.detail ? <span className="text-[var(--text-muted)]"> · {d.detail}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Nothing stored yet.{' '}
          <Link href="/memory" className="underline underline-offset-2">
            Open Memory
          </Link>
        </p>
      )}
    </section>
  );
}
