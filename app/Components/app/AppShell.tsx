'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconShieldLock } from '@tabler/icons-react';
import { clearAuthSession, getStoredUser, logout, type UserProfile } from '../../lib/auth';
import { ThemeToggle } from '../ui/ThemeToggle';
import { IncognitoToggle } from '../ui/IncognitoToggle';
import { useTheme } from '../ui/ThemeProvider';

export type AppNavId = 'chat' | 'research' | 'globe' | 'dashboard' | 'profile';

const LINKS: Array<{ id: AppNavId; href: string; label: string }> = [
  { id: 'chat', href: '/research', label: 'Chat' },
  { id: 'globe', href: '/globe', label: 'Globe' },
  { id: 'dashboard', href: '/Dashboard', label: 'Dashboard' },
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
  // Legacy "research" nav id maps to Chat
  return active === 'research' ? 'chat' : active;
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
  const current = resolveActive(active);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className={`app-shell flex flex-col ${isIncognito ? 'app-shell--incognito' : ''}`}>
      <header className="app-topnav">
        <Link href="/research" className="mr-4 flex items-center gap-2 font-serif text-lg tracking-tight sm:mr-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3836C] text-sm font-semibold text-white">
            A
          </span>
          <span className="hidden xs:inline sm:inline">AnalyzeIt</span>
        </Link>
        <nav className="flex flex-1 items-center gap-3 overflow-x-auto sm:gap-5">
          {LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              data-active={current === link.id || (link.id === 'chat' && current === 'research')}
              className="app-topnav-link shrink-0"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="relative flex items-center gap-1.5 sm:gap-2">
          <IncognitoToggle showLabel />
          <ThemeToggle />
          <span className="tier-badge hidden md:inline">{tierLabel(user?.tier)}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[11px] font-medium text-[var(--text-primary)]"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            {initials(user)}
          </button>
          {menuOpen ? (
            <div className="app-card absolute right-0 top-11 z-50 min-w-[10rem] overflow-hidden py-1 text-sm">
              <Link
                href="/profile"
                className="block px-3 py-2 hover:bg-[var(--surface-3)]"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/billing"
                className="block px-3 py-2 hover:bg-[var(--surface-3)]"
                onClick={() => setMenuOpen(false)}
              >
                Billing
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[var(--surface-3)]"
                onClick={() => {
                  logout();
                  clearAuthSession();
                  setMenuOpen(false);
                  router.push('/login');
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {isIncognito ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-violet-500/25 bg-violet-950/80 px-4 py-1.5 text-[11px] font-mono text-violet-200">
          <IconShieldLock size={13} className="text-violet-300" />
          <span>
            <strong>Incognito:</strong> this session is ephemeral — nothing is saved to your history.
          </span>
        </div>
      ) : null}

      <div
        className={`app-shell-body flex-1 min-h-0 ${
          flush ? 'flex flex-col overflow-hidden' : 'overflow-y-auto px-5 py-6 sm:px-8'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
