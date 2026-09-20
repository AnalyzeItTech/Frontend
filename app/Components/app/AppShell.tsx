'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  IconFolder,
  IconLogout,
  IconMenu2,
  IconShieldLock,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { clearAuthSession, getStoredUser, logout, type UserProfile } from '../../lib/auth';
import { ThemeToggle } from '../ui/ThemeToggle';
import { IncognitoToggle } from '../ui/IncognitoToggle';
import { useTheme } from '../ui/ThemeProvider';
import { RequireAuth } from './RequireAuth';
import { FeedbackWidget } from './FeedbackWidget';

export type AppNavId = 'chat' | 'research' | 'globe' | 'dashboard' | 'connectors' | 'objects' | 'billing' | 'profile';

const LINKS: Array<{ id: AppNavId; href: string; label: string }> = [
  { id: 'chat', href: '/research', label: 'Chat' },
  { id: 'globe', href: '/globe', label: 'Globe' },
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { id: 'connectors', href: '/connectors', label: 'Connectors' },
  { id: 'objects', href: '/objects', label: 'Objects' },
  { id: 'billing', href: '/billing', label: 'Billing' },
  { id: 'profile', href: '/profile', label: 'Profile' },
];

function tierLabel(raw?: string) {
  const t = (raw || 'free').replace(/_/g, ' ');
  return t.toUpperCase();
}

function initials(user: UserProfile | null) {
  const name = user?.name || user?.email || 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function resolveActive(active: AppNavId): AppNavId {
  return active === 'research' ? 'chat' : active;
}

function isLinkActive(linkId: AppNavId, current: AppNavId) {
  return current === linkId || (linkId === 'chat' && current === 'research');
}

export function AppShell({
  active,
  children,
  flush,
}: {
  active: AppNavId;
  children: React.ReactNode;
  flush?: boolean;
}) {
  const router = useRouter();
  const { isIncognito } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const layoutId = useId();
  const current = resolveActive(active);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

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

  const signOut = () => {
    logout();
    clearAuthSession();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/login');
  };

  return (
    <RequireAuth>
      <div className={`app-shell flex flex-col ${isIncognito ? 'app-shell--incognito' : ''}`}>
        <header className="app-topnav">
          <Link
            href="/research"
            className="mr-3 flex shrink-0 items-center gap-2 font-serif text-lg tracking-tight sm:mr-5"
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
            <nav className="hidden flex-1 items-center gap-1 md:flex lg:gap-2" aria-label="Primary">
              {LINKS.map((link) => {
                const activeLink = isLinkActive(link.id, current);
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
            <IncognitoToggle showLabel={false} className="hidden sm:inline-flex" />
            <ThemeToggle />
            <span className="tier-badge hidden lg:inline">{tierLabel(user?.tier)}</span>

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
                      href="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      <IconUser size={14} className="text-[var(--text-muted)]" />
                      Profile
                    </Link>
                    <Link
                      href="/profile#projects"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={() => setMenuOpen(false)}
                    >
                      <IconFolder size={14} className="text-[var(--text-muted)]" />
                      Projects
                    </Link>
                    <Link
                      href="/billing"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-3)]"
                      onClick={() => setMenuOpen(false)}
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
                  {LINKS.map((link, index) => {
                    const activeLink = isLinkActive(link.id, current);
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
                    <IncognitoToggle showLabel />
                    <ThemeToggle showLabel />
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    {tierLabel(user?.tier)}
                  </p>
                </div>
              </motion.nav>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {isIncognito ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="flex shrink-0 items-center justify-center gap-2 overflow-hidden border-b border-violet-500/25 bg-violet-950/80 px-4 py-1.5 text-[11px] font-mono text-violet-200"
          >
            <IconShieldLock size={13} className="text-violet-300" />
            <span>
              <strong>Incognito:</strong> this session is ephemeral — nothing is saved to your history.
            </span>
          </motion.div>
        ) : null}

        <div
          className={`app-shell-body min-h-0 flex-1 ${
            flush ? 'app-shell-body--flush flex flex-col overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </div>
        <Suspense fallback={null}>
          <FeedbackWidget />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
