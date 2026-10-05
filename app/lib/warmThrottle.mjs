// Decides whether opening a page should ask Backend A to wake the agent.

export const WARM_MIN_MS = 4 * 60 * 1000; // the agent stays warm for a few minutes on its own; no need to ask more often

/**
 * @param {number | null | undefined} lastAt ms timestamp of the last warm request from this browser tab, if any
 * @param {number} now ms timestamp
 * @param {number} [minMs]
 */
export function shouldWarm(lastAt, now, minMs = WARM_MIN_MS) {
  if (typeof lastAt !== 'number' || !Number.isFinite(lastAt)) return true;
  if (lastAt > now) return true; // a clock that went backwards must not suppress warming forever
  return now - lastAt >= minMs;
}
