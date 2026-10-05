// How a stored source reads in the Memory list: its name first, then what it is and when it was added.

/**
 * @param {{ title?: string | null, kind_label?: string | null, kind?: string | null, tokens?: number, created_at?: string | null, pinned?: boolean }} row
 * @returns {{ heading: string, detail: string }}
 */
export function describeSource(row) {
  const title = typeof row?.title === 'string' ? row.title.trim() : '';
  const kind = (typeof row?.kind_label === 'string' && row.kind_label.trim()) || 'Stored note';
  const tokens = Number.isFinite(row?.tokens) ? Math.max(0, Math.round(row.tokens)) : 0;
  const when = row?.created_at ? new Date(row.created_at) : null;
  const date = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
  const parts = [title ? kind : null, `${tokens.toLocaleString('en-US')} tokens`, date || null, row?.pinned ? 'pinned' : null].filter(Boolean);
  return { heading: title || kind, detail: parts.join(' · ') };
}

/** "just now", "5 minutes ago", "3 days ago", "2 months ago" (relative to `now`, ms). */
export function relativeTime(iso, now = Date.now()) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const units = [['minute', 60], ['hour', 3600], ['day', 86400], ['month', 2592000], ['year', 31536000]];
  let best = ['minute', 60];
  for (const u of units) if (s >= u[1]) best = u;
  const n = Math.floor(s / best[1]);
  return `${n} ${best[0]}${n === 1 ? '' : 's'} ago`;
}

/** How much the assistant has leaned on this source. */
export function usageLine(row, now = Date.now()) {
  const n = Number(row?.cite_count) || 0;
  if (n <= 0) return 'Not used in an answer yet';
  const when = relativeTime(row?.last_cited_at, now);
  return `Used in ${n} answer${n === 1 ? '' : 's'}${when ? ` · last ${when}` : ''}`;
}

/** Plain words for how findable the source is. Unknown (older sources) says nothing rather than guessing. */
export function searchLine(level, state) {
  if (state && state !== 'ready') return 'Still being processed';
  if (level === 'full') return 'Every passage can be found by meaning and by exact words';
  if (level === 'summary') return 'Found through its summary and exact words (your fast-search allowance is used up)';
  return '';
}
