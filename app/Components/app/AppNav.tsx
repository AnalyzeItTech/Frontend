'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  IconFolder,
  IconLogout,
  IconMenu2,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { clearAuthSession, getStoredUser, logout, planTierLabel, type UserProfile } from '../../lib/auth';
import { ThemeToggle } from '../ui/ThemeToggle';
import { IncognitoToggle } from '../ui/IncognitoToggle';
import {
  APP_NAV_LINKS,
  LOGO_HREF,
  MARKETING_SECTION_LINKS,
  isAppLinkActive,
  resolveActiveNav,
} from './appNavConfig.mjs';

export type AppNavId =
  | 'chat'
  | 'research'
  | 'globe'
  | 'dashboard'
  | 'connectors'
  | 'objects'
  | 'billing'
  | 'profile';

export type AppNavSurface = 'marketing' | 'app';

function tierLabel(raw?: string) {
  return planTierLabel(raw).toUpperCase();
}

function initials(user: UserProfile | null) {
  const name = user?.name || user?.email || 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

let cachedUser: UserProfile | null = null;
let cachedUserKey = '';

function userCacheKey(user: UserProfile | null) {
  if (!user) return '';
  return [user.id, user.email, user.name, user.tier ?? ''].join('\u0000');
}

function subscribeStoredUser(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** Stable snapshot so useSyncExternalStore can read localStorage without an effect. */
function readStoredUser(): UserProfile | null {
  const next = getStoredUser();
  const key = userCacheKey(next);
  if (key === cachedUserKey) return cachedUser;
  cachedUserKey = key;
  cachedUser = next;
  return cachedUser;
}

function readServerUser(): UserProfile | null {
  return null;
}

/**
 * One nav frame for marketing Home and authenticated app pages.
 * Link sets change with `surface`; height, logo, and auth chip do not.
 */
export function AppNav({
  surface,
  active = 'dashboard',
}: {
  surface: AppNavSurface;
  active?: AppNavId;
}) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeStoredUser, readStoredUser, readServerUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const layoutId = useId();
  const current = resolveActiveNav(active);
  const showAccountChip = surface === 'app' || Boolean(user);

  useEffect(() => {
    if (!menuOpen && !mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [menuOpen, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMenus = () => {
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const signOut = () => {
    logout();
    clearAuthSession();
    closeMenus();
    router.push('/login');
  };

  const onMarketingClick = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={`app-topnav${surface === 'marketing' ? ' app-topnav--fixed' : ''}`}
        data-app-nav={surface}
      >
        <Link
          href={LOGO_HREF}
          aria-label="AnalyzeIt home"
          className="mr-3 flex shrink-0 items-center gap-2 sm:mr-5"
          onClick={(event) => {
            if (window.location.pathname !== '/') return;
            event.preventDefault();
            if (window.location.hash) {
              window.history.replaceState(null, '', LOGO_HREF);
            }
          }}
        >
          <Image
            src="/logo.png"
            alt="AnalyzeIt"
            width={120}
            height={28}
            className="h-6 w-auto object-contain dark:rounded-md dark:bg-[#E9DDD2] dark:px-1.5 dark:py-0.5"
            priority
          />
        </Link>

        <LayoutGroup id={layoutId}>
          <nav className="app-topnav-links hidden flex-1 items-center gap-1 md:flex lg:gap-2" aria-label="Primary">
            {surface === 'marketing'
              ? MARKETING_SECTION_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="app-topnav-link relative shrink-0"
                    onClick={(event) => {
                      event.preventDefault();
                      onMarketingClick(link.id);
                    }}
                  >
                    {link.label}
                  </a>
                ))
              : APP_NAV_LINKS.map((link) => {
                  const activeLink = isAppLinkActive(link.id, current);
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      data-active={activeLink}
                      className="app-topnav-link relative shrink-0"
                    >
                      {link.label}
                      {activeLink ? (
                        <motion.span
                          layoutId="app-nav-underline"
                          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--coral,#EA8069)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      ) : null}
                    </Link>
                  );
                })}
          </nav>
        </LayoutGroup>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {surface === 'app' ? (
            <IncognitoToggle showLabel={false} className="hidden sm:inline-flex" />
          ) : null}
          <ThemeToggle />
          {showAccountChip ? (
            <span className="tier-badge hidden lg:inline">{tierLabel(user?.tier)}</span>
          ) : null}

          {showAccountChip ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-medium text-[var(--text-primary)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                {initials(user)}
              </button>
              <AnimatePresence>
                {menuOpen ? (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="app-card absolute right-0 top-11 z-50 min-w-[12rem] overflow-hidden py-1 text-sm shadow-lg"
                  >
                    <div className="border-b border-[var(--border)] px-3 py-2">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {user?.name || 'Account'}
                      </p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={closeMenus}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={closeMenus}
                    >
                      <IconUser size={14} className="text-[var(--text-muted)]" />
                      Profile
                    </Link>
                    <Link
                      href="/profile#projects"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={closeMenus}
                    >
                      <IconFolder size={14} className="text-[var(--text-muted)]" />
                      Projects
                    </Link>
                    <Link
                      href="/billing"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={closeMenus}
                    >
                      Billing
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#9B4D3B] hover:bg-[var(--surface-3)]"
                      onClick={signOut}
                    >
                      <IconLogout size={14} />
                      Log out
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Sign in
              </Link>
              <Link
                href="/login?tab=register"
                className="hidden rounded-full bg-[var(--coral,#E3836C)] px-3 py-1.5 text-xs font-medium text-[#FFF7F1] shadow-xs transition-colors hover:bg-[#ED967F] sm:inline-flex"
              >
                Get started
              </Link>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-nav"
            className="fixed inset-0 z-[90] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-label="Dismiss menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              aria-label="Mobile"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <p className="font-serif text-base tracking-tight">Navigate</p>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  aria-label="Close"
                  onClick={() => setMobileOpen(false)}
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-3">
                {surface === 'marketing'
                  ? MARKETING_SECTION_LINKS.map((link, index) => (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * index, duration: 0.2 }}
                      >
                        <a
                          href={`#${link.id}`}
                          className="mb-0.5 flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                          onClick={(event) => {
                            event.preventDefault();
                            onMarketingClick(link.id);
                          }}
                        >
                          {link.label}
                        </a>
                      </motion.div>
                    ))
                  : APP_NAV_LINKS.map((link, index) => {
                      const activeLink = isAppLinkActive(link.id, current);
                      return (
                        <motion.div
                          key={link.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * index, duration: 0.2 }}
                        >
                          <Link
                            href={link.href}
                            data-active={activeLink}
                            className={`mb-0.5 flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                              activeLink
                                ? 'bg-[#EA8069]/15 text-[#EA8069]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                            }`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {link.label}
                            {activeLink ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral,#EA8069)]" />
                            ) : null}
                          </Link>
                        </motion.div>
                      );
                    })}
              </div>
              <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  {surface === 'app' ? (
                    <IncognitoToggle showLabel />
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">AnalyzeIt</span>
                  )}
                  <ThemeToggle showLabel />
                </div>
                {showAccountChip ? (
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    {tierLabel(user?.tier)}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/login?tab=register"
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--coral,#E3836C)] px-3 py-2 text-xs font-medium text-[#FFF7F1]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
