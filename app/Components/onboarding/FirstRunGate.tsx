'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../lib/auth';
import { ONBOARDING_PATH } from '../../lib/onboarding.mjs';
import { resolveFirstRun } from './resolveFirstRun';

/**
 * If this signed-in account still owes a first run, leave chat for /onboarding.
 * Renders nothing, so the chat empty state and composer stay as they are.
 */
export function FirstRunGate() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.id) return;
    let cancelled = false;
    resolveFirstRun(user)
      .then((decision) => {
        if (cancelled) return;
        if (decision.action === 'show') router.replace(ONBOARDING_PATH);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
