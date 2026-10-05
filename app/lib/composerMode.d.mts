export const COMPOSER_SEGMENTS: readonly ['chat', 'research', 'globe'];

export type ComposerSegment = (typeof COMPOSER_SEGMENTS)[number];

export const RESEARCH_EMPTY_TITLE: string;

export const RESEARCH_EMPTY_SUB: string;

export const GLOBE_SIGN_IN_LINE: 'Sign in to use Globe';

export function moveComposerSegment(index: number, key: string): number | null;

export function globeSegmentResult(
  hasSession: boolean,
): { kind: 'navigate'; href: '/globe' } | { kind: 'gate'; message: typeof GLOBE_SIGN_IN_LINE };

export function researchComposerFocus(
  mode: string | null | undefined,
  roving: string | null | undefined,
  options?: { entered?: boolean },
): { mode: 'chat' | 'research'; tabStop: 'chat' | 'research' | 'globe' };
