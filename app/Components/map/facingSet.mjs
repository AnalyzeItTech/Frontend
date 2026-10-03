/**
 * Far-side culling: the set of marker keys facing the camera changes only when a point crosses the horizon,
 * but the camera `move` event fires every frame. Setting React state with a fresh Set each time re-rendered every
 * marker 60 times a second. Compare first; update only on a real change.
 */

/** @param {Set<string> | null | undefined} a @param {Set<string> | null | undefined} b */
export function sameKeySet(a, b) {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}
