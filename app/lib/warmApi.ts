import { getAuthHeaders, getStoredToken } from './auth';
import { shouldWarm } from './warmThrottle.mjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const KEY = 'analyzeit_warm_at';

/**
 * Tell Backend A the agent will be needed soon, so it wakes up in the background. Fire and forget: it never blocks the page,
 * never shows an error, does nothing for signed-out visitors, and asks at most once every few minutes per tab.
 */
export function warmAgent(options: { guest?: boolean } = {}): void {
  // Signed-out visitors only warm from the public demo, where a question is about to be asked.
  if (typeof window === 'undefined' || (!getStoredToken() && !options.guest)) return;
  const now = Date.now();
  let last: number | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    last = raw ? Number(raw) : null;
  } catch {
    // storage blocked: still warm, just without the per-tab throttle
  }
  if (!shouldWarm(last, now)) return;
  try {
    window.sessionStorage.setItem(KEY, String(now));
  } catch {
    // ignore
  }
  void fetch(`${API_BASE}/v1/warm`, { method: 'POST', headers: getAuthHeaders(), keepalive: true }).catch(() => undefined);
}
