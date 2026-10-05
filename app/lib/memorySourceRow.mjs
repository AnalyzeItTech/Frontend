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
