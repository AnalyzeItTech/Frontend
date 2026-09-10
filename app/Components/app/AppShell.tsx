'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAuthSession, getStoredUser, logout, type UserProfile } from '../../lib/auth';

export type AppNavId = 'research' | 'globe' | 'dashboard' | 'profile';

const LINKS: Array<{ id: AppNavId; href: string; label: string }> = [
  { id: 'research', href: '/research', label: 'Research' },
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className="app-shell">
      <header className="app-topnav">
        <Link href="/research" className="mr-6 flex items-center gap-2 font-serif text-lg tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3836C] text-sm font-semibold text-white">
            A
          </span>
          AnalyzeIt
        </Link>
        <nav className="flex flex-1 items-center gap-5">
          {LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              data-active={active === link.id}
              className="app-topnav-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="relative flex items-center gap-2">
          <span className="tier-badge hidden sm:inline">{tierLabel(user?.tier)}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4A4238]/15 bg-[#F3EDE4] text-[11px] font-medium"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            {initials(user)}
          </button>
          {menuOpen ? (
            <div className="app-card absolute right-0 top-11 z-50 min-w-[10rem] overflow-hidden py-1 text-sm">
              <Link href="/profile" className="block px-3 py-2 hover:bg-[#EDE4D8]" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Link href="/billing" className="block px-3 py-2 hover:bg-[#EDE4D8]" onClick={() => setMenuOpen(false)}>
                Billing
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#EDE4D8]"
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
      <div className={flush ? '' : 'px-5 py-6 sm:px-8'}>{children}</div>
    </div>
  );
}
