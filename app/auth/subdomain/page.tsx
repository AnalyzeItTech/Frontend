'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, fetchMe, getStoredToken } from '../../lib/auth';
import { isValidPersonalSlug, returnUrlForPersonalSlug } from '../../lib/personalHost.mjs';

/**
 * Canonical-host bridge for yourname.analyzeit.in.
 * localStorage on www holds the bearer token; this page confirms it and
 * returns the browser to the personal host, which can then read the
 * parent-domain session cookie written by the boot script.
 */
export default function SubdomainHandoffPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Checking your session…');

  useEffect(() => {
    let cancelled = false;
    const slug = (new URLSearchParams(window.location.search).get('slug') || '').toLowerCase();
    if (!isValidPersonalSlug(slug)) {
      queueMicrotask(() => {
        if (!cancelled) setMessage('That personal link is not valid.');
      });
      return () => {
        cancelled = true;
      };
    }

    const next = `/auth/subdomain?slug=${encodeURIComponent(slug)}`;

    async function handoff() {
      if (!getStoredToken()) {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          clearAuthSession();
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        const dest = returnUrlForPersonalSlug(slug, window.location, getStoredToken());
        if (!dest) {
          setMessage('That personal link is not valid.');
          return;
        }
        setMessage(`Opening ${slug}.analyzeit.in…`);
        window.location.replace(dest);
      } catch (err) {
        if (cancelled) return;
        setMessage(err instanceof Error ? err.message : 'Could not open this personal link. Try again in a moment.');
      }
    }

    void handoff();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-6 text-center text-[var(--text-primary)]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E3836C]/25 border-t-[#E3836C]" />
      <p className="max-w-md text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}
