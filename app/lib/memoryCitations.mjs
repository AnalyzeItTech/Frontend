// Citation chips for answers that drew on the user's stored memory.

export const MAX_CITATIONS = 6;
const MAX_EXCERPT = 300;

/**
 * Clean the `memory_sources` list from a final event: keep well-formed items, drop duplicates, cap the count and the
 * excerpt length, and put passages the agent opened (read in full) before ones that only matched.
 * @param {unknown} raw
 * @returns {Array<{ key: string, label: string, excerpt: string, opened: boolean }>}
 */
export function normalizeMemorySources(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const sourceId = typeof item.source_id === 'string' ? item.source_id.trim() : '';
    if (!sourceId) continue;
    const entryId = typeof item.entry_id === 'string' ? item.entry_id : '';
    const key = `${sourceId}:${entryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : 'Stored note';
    const text = typeof item.excerpt === 'string' ? item.excerpt.replace(/\s+/g, ' ').trim() : '';
    const excerpt = text.length > MAX_EXCERPT ? `${text.slice(0, MAX_EXCERPT - 1)}…` : text;
    out.push({ key, label, excerpt, opened: item.opened === true });
  }
  out.sort((a, b) => Number(b.opened) - Number(a.opened));
  return out.slice(0, MAX_CITATIONS);
}
