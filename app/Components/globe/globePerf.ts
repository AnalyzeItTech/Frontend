import { deviceTier, tierSettings } from './deviceTier.mjs';

/** Live weather/markets (when enabled) poll on an interval — never per frame. */
export const LIVE_LAYER_POLL_MS = 45_000;

/** Recursive research hops: keep a short queue so later sources still fly, without unbounded tweens. */
export const MAX_FLY_QUEUE = 8;

/** Mini globe shows this chat run's pins only, capped. */
export const MINI_PIN_CAP = 32;

export function miniPixelRatio(dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1) {
  return Math.min(Math.max(dpr || 1, 1), 1);
}

export function fullPixelRatio(dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1) {
  return Math.min(Math.max(dpr || 1, 1), currentTierSettings().maxPixelRatio);
}

let cachedTier: 'low' | 'standard' | null = null;

/** Detected once per page; hardware does not change while the globe is open. */
export function currentDeviceTier(): 'low' | 'standard' {
  if (cachedTier) return cachedTier;
  if (typeof window === 'undefined') return 'standard';
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  cachedTier = deviceTier({
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    narrow: window.innerWidth < 640,
  });
  return cachedTier;
}

export function currentTierSettings() {
  return tierSettings(currentDeviceTier());
}

export function isGlobePath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return (
    pathname === '/research' ||
    pathname.startsWith('/research/') ||
    pathname === '/new-project' ||
    pathname.startsWith('/new-project/') ||
    pathname === '/globe' ||
    pathname.startsWith('/globe/')
  );
}
