/**
 * Size ads to remaining infra (Render A + Azure Container Apps B + Atlas).
 * Do not assume A+B can share one Render instance — B is on Azure.
 *
 * At ~$8 eCPM, covering $25–75/mo needs ~3.1k–9.4k views/month.
 * With ~24k queries/month at 1000 users (20% DAU × 4 queries):
 *   tighter month ≈ 1 in 2.5 queries → NEXT_PUBLIC_AD_EVERY_N=3
 *   lean month   ≈ 1 in 7–8 queries → default 8
 *
 * Session-start ads are extra inventory and stay once per browser session.
 */
const STORAGE_KEY = 'analyzeit_free_query_count';

export function adEveryNQueries(): number {
  const raw = Number(process.env.NEXT_PUBLIC_AD_EVERY_N || '8');
  if (!Number.isFinite(raw) || raw < 1) return 8;
  return Math.floor(raw);
}

/** Increment completed-query count; true when this query should show a post-run unit. */
export function shouldShowPostRunAd(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const n = Number(window.localStorage.getItem(STORAGE_KEY) || '0') + 1;
    window.localStorage.setItem(STORAGE_KEY, String(n));
    return n % adEveryNQueries() === 0;
  } catch {
    return true;
  }
}
