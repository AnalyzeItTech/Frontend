export const LOGO_HREF: '/';

export const MARKETING_SECTION_LINKS: ReadonlyArray<{
  id: string;
  label: string;
}>;

export const APP_NAV_LINKS: ReadonlyArray<{
  id: string;
  href: string;
  label: string;
}>;

export function resolveActiveNav(active: string): string;
export function isAppLinkActive(linkId: string, current: string): boolean;
