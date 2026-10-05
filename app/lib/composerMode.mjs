/**
 * Research home: empty-state copy and composer mode keyboard.
 * Chat and Research stay local modes. Globe opens /globe, or asks to sign in.
 */

export const COMPOSER_SEGMENTS = ['chat', 'research', 'globe'];

export const RESEARCH_EMPTY_TITLE = 'Ask what your data already knows';

/** One plain line. No internal names (RLM, CSR, Azure). */
export const RESEARCH_EMPTY_SUB = 'A quiet place to ask in plain words.';

export const GLOBE_SIGN_IN_LINE = 'Sign in to use Globe';

/**
 * @param {number} index
 * @param {string} key
 * @returns {number | null}
 */
export function moveComposerSegment(index, key) {
  const count = COMPOSER_SEGMENTS.length;
  const i = ((index % count) + count) % count;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (i + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (i - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * Signed-in Globe keeps the existing deep link. Without a session, stay on the
 * page and show the sign-in line instead of sending the visitor into a spinner.
 * @param {boolean} hasSession
 * @returns {{ kind: 'navigate', href: '/globe' } | { kind: 'gate', message: string }}
 */
export function globeSegmentResult(hasSession) {
  if (hasSession) return { kind: 'navigate', href: '/globe' };
  return { kind: 'gate', message: GLOBE_SIGN_IN_LINE };
}
