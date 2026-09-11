'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchMe, getStoredToken, syncAuthCookieFromStorage } from '../../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      if (!getStoredToken()) {
        const next = `${pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      if (!cancelled) {
        syncAuthCookieFromStorage();
        setAllowed(true);
      }

      const me = await fetchMe();
      if (cancelled) return;
      if (!me && !getStoredToken()) {
        setAllowed(false);
        const next = `${pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    }

    void gate();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] text-[var(--text-primary)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E3836C]/25 border-t-[#E3836C]" />
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          Checking account…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
