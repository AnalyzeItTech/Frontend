export const AUTH_COOKIE: string;
export const SESSION_COOKIE: string;
export const TOKEN_STORAGE_KEY: string;

export function isValidPersonalSlug(slug: string): boolean;
export function publicHost(hostHeader: string | null | undefined, forwardedHeader?: string | null): string;
export function extractPersonalSlug(hostHeader: string | null | undefined): string | null;
export function canonicalAppOrigin(input: { protocol?: string; hostHeader?: string | null }): string;

export type HostDecision =
  | { action: 'next' }
  | { action: 'redirect'; status: number; url: string }
  | { action: 'rewrite'; slug: string };

export function decideHostRequest(input: {
  hostHeader?: string | null;
  pathname?: string;
  search?: string;
  protocol?: string;
  sessionCookie?: string;
}): HostDecision;

export function returnUrlForPersonalSlug(
  slug: string,
  loc: { hostname?: string; protocol?: string; port?: string },
  token?: string | null,
): string | null;

export function personalSlugAllowed(user: {
  tier?: string;
  entitlements?: Record<string, unknown> | null;
} | null): boolean | null;

export function classifySlugFailure(
  status: number,
  upgradeRequired?: boolean,
): 'upgrade' | 'missing' | 'denied' | 'error';

export function buildSessionBootScript(): string;
