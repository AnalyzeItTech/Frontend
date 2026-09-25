/** Shared nav contract for marketing Home and the authenticated app shell. */

export const LOGO_HREF = '/';

/** In-page sections on the marketing home page. */
export const MARKETING_SECTION_LINKS = [
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'comparison', label: 'Why Calm' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

/**
 * App chrome links. Home is explicit so signed-in pages are not a dead end;
 * the logo uses LOGO_HREF as well.
 */
export const APP_NAV_LINKS = [
  { id: 'home', href: '/', label: 'Home' },
  { id: 'chat', href: '/research', label: 'Chat' },
  { id: 'globe', href: '/globe', label: 'Globe' },
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { id: 'connectors', href: '/connectors', label: 'Connectors' },
  { id: 'objects', href: '/objects', label: 'Objects' },
  { id: 'billing', href: '/billing', label: 'Billing' },
  { id: 'profile', href: '/profile', label: 'Profile' },
];

export function resolveActiveNav(active) {
  return active === 'research' ? 'chat' : active;
}

export function isAppLinkActive(linkId, current) {
  const resolved = resolveActiveNav(current);
  return resolved === linkId || (linkId === 'chat' && current === 'research');
}
