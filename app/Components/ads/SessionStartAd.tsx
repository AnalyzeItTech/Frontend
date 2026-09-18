'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { AdSlot } from './AdSlot';

const SESSION_KEY = 'analyzeit_session_ad_shown';

type SessionStartAdProps = {
  enabled: boolean;
};

/** Compact top-of-chat banner, once per browser session. */
export function SessionStartAd({ enabled }: SessionStartAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      /* private mode */
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
    <div className="relative shrink-0 border-b border-[var(--border)] px-4 py-2 sm:px-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-5 top-2 z-10 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        aria-label="Dismiss sponsored banner"
      >
        <IconX size={14} />
      </button>
      <AdSlot placement="session-start" enabled className="pr-8" onLoaded={() => undefined} />
    </div>
  );
}
