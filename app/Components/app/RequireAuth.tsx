'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiUnavailableError, clearAuthSession, fetchMe, getStoredToken } from '../../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [unavailable, setUnavailable] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      const next = `${pathname}${window.location.search}`;
      if (!getStoredToken()) {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          clearAuthSession();
          setAllowed(false);
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setUnavailable('');
        setAllowed(true);
      } catch (err) {
        if (cancelled) return;
        setAllowed(false);
        setUnavailable(
          err instanceof ApiUnavailableError
            ? err.message
            : 'We are seeing a large number of people right now because of high demand. Please try again in a little while.',
        );
      }
    }

    void gate();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (unavailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-6 text-center text-[var(--text-primary)]">
        <p className="font-serif text-xl">Please try again shortly</p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">{unavailable}</p>
      </div>
    );
  }

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
