// Which dashboard widgets should refresh themselves when the dashboard opens.
// Only zero-token data bindings (the user's own objects) qualify: opening a dashboard must never spend model tokens.

export const LIVE_QUERY_TYPES = ['object_records', 'object_aggregate'];
export const MAX_PER_OPEN = 12;
export const MIN_AGE_MS = 60_000;

/** @param {any} w */
function isLive(w) {
  const mode = w?.refresh_policy?.mode;
  const q = w?.binding?.query_type;
  return mode === 'on_open' && LIVE_QUERY_TYPES.includes(q);
}

/**
 * Ids of widgets worth refreshing now: live-bound, set to refresh on open, and not refreshed in the last minute.
 * @param {any[]} widgets
 * @param {number} now ms since epoch
 */
export function staleLiveWidgets(widgets, now, minAgeMs = MIN_AGE_MS, max = MAX_PER_OPEN) {
  const out = [];
  for (const w of widgets || []) {
    if (!w?.id || !isLive(w)) continue;
    const last = Date.parse(w.binding?.last_refreshed_at || '');
    if (Number.isFinite(last) && now - last < minAgeMs) continue;
    out.push(String(w.id));
    if (out.length >= max) break;
  }
  return out;
}
