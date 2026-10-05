// The intro loader's progress is a pure function of elapsed time, so it catches up after the browser stalls
// (a heavy scene blocks timers; a tick-by-tick counter would sit at 0% until the stall ends).

export const LOADER_DURATION_MS = 3200; // time to reach 100%
export const LOADER_MAX_MS = 6000; // never show the loader longer than this, however slow the machine is
export const LOADER_SKIP_AFTER_MS = 1500; // a Skip button appears after this

/** 0..100, easing out so it feels like loading and not a stopwatch. */
export function loaderProgress(elapsedMs) {
  const t = Math.min(1, Math.max(0, (Number(elapsedMs) || 0) / LOADER_DURATION_MS));
  return 100 * (1 - Math.pow(1 - t, 2.2));
}

export function loaderStatus(progress) {
  if (progress < 30) return 'CALIBRATING ATMOSPHERE';
  if (progress < 60) return 'PREPARING ISLANDS';
  if (progress < 90) return 'CONNECTING DATA FLOWS';
  return 'EXPERIENCE READY';
}

/** True once the loader has run too long and must give way. */
export function loaderExpired(elapsedMs) {
  return (Number(elapsedMs) || 0) >= LOADER_MAX_MS;
}

export function skipVisible(elapsedMs) {
  return (Number(elapsedMs) || 0) >= LOADER_SKIP_AFTER_MS;
}
