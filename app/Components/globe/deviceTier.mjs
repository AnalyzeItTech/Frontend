/**
 * Decide how much the globe should draw on this device. A 2x pixel ratio, 300 ms tile fades and a large tile cache
 * are fine on a laptop but make a budget phone stutter. Pure so it can be tested without a browser.
 *
 * @param {{ cores?: number, memoryGb?: number, saveData?: boolean, reducedMotion?: boolean, narrow?: boolean }} [env]
 * @returns {'low' | 'standard'}
 */
export function deviceTier(env = {}) {
  const { cores, memoryGb, saveData, reducedMotion, narrow } = env;
  if (saveData) return 'low';
  if (Number.isFinite(memoryGb) && memoryGb <= 4) return 'low';
  if (Number.isFinite(cores) && cores <= 4) return 'low';
  // A narrow touch screen with unknown specs (Safari reports neither) is most often a phone.
  if (narrow && !Number.isFinite(cores) && !Number.isFinite(memoryGb)) return 'low';
  if (reducedMotion) return 'low';
  return 'standard';
}

/** What each tier means for the map. */
export function tierSettings(tier) {
  return tier === 'low'
    ? { maxPixelRatio: 1.25, fadeMs: 0, tileCache: 80, idleDrift: false }
    : { maxPixelRatio: 2, fadeMs: 300, tileCache: 180, idleDrift: true };
}
