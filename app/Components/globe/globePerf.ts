/** Live weather/markets (when enabled) poll on an interval — never per frame. */
export const LIVE_LAYER_POLL_MS = 45_000;

/** Cancel/replace in-flight camera tweens; never stack unbounded fly-tos. */
export const MAX_FLY_QUEUE = 2;

/** Mini globe shows this chat run's pins only, capped. */
export const MINI_PIN_CAP = 32;

export function miniPixelRatio(dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1) {
  return Math.min(Math.max(dpr || 1, 1), 1);
}

export function fullPixelRatio(dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1) {
  return Math.min(Math.max(dpr || 1, 1), 2);
}

export function isGlobePath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return (
    pathname === '/research' ||
    pathname.startsWith('/research/') ||
    pathname === '/globe' ||
    pathname.startsWith('/globe/')
  );
}
