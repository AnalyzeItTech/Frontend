'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { AdSlot, isAdPlacementConfigured } from './AdSlot';

const SESSION_KEY = 'analyzeit_session_ad_shown';

type SessionStartAdProps = {
  enabled: boolean;
};

/** Compact top-of-chat banner, once per browser session — only when AdSense fills. */
export function SessionStartAd({ enabled }: SessionStartAdProps) {
  const [visible, setVisible] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (!isAdPlacementConfigured('session-start')) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      /* private mode */
    }
    setVisible(true);
  }, [enabled]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setFilled(false);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (!enabled || !visible) return null;

  return (
    <div
      className={
        filled
          ? 'relative shrink-0 border-b border-[var(--border)] px-4 py-2 sm:px-6'
          : 'contents'
      }
    >
      {filled ? (
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-5 top-2 z-10 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
          aria-label="Dismiss sponsored banner"
        >
          <IconX size={14} />
        </button>
      ) : null}
      <AdSlot
        placement="session-start"
        enabled
        className="pr-8"
        onLoaded={() => setFilled(true)}
        onDismiss={dismiss}
      />
    </div>
  );
}
