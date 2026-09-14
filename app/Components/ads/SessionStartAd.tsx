'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { AdSlot } from './AdSlot';

const SESSION_KEY = 'analyzeit_session_ad_shown';

type SessionStartAdProps = {
  /** Only render when entitlements say ads are shown (ads_free === false). */
  enabled: boolean;
};

/**
 * One dismissible banner per browser session for free users on research / new project.
 */
export function SessionStartAd({ enabled }: SessionStartAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      // private mode — still show once via state
    }
    setVisible(true);
  }, [enabled]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (!enabled || !visible) return null;

  return (
    <div className="relative mx-auto mb-4 w-full max-w-3xl px-4 pt-3">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-6 top-5 z-10 rounded-md p-1 text-[#8A7F74] hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Dismiss sponsored banner"
      >
        <IconX size={14} />
      </button>
      <AdSlot placement="session-start" enabled onLoaded={() => undefined} />
    </div>
  );
}
