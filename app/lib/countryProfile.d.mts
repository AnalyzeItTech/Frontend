export const COUNTRY_COOKIE: string;
export function normalizeCountry(value: unknown): string | null;
export function resolveCountry(input?: { cookie?: string | null; language?: string | null }): string | null;
export function cookieCountry(cookieString: string): string | null;
export function localPriceNote(estimate: { currency?: string; amount?: number | string | null } | null | undefined, country: string | null): string | null;
export type TrustProfile = {
  country: string | null;
  heading: string;
  points: { title: string; body: string }[];
  links: { href: string; label: string }[];
};
export function trustProfile(country: string | null | undefined, email: string): TrustProfile;
