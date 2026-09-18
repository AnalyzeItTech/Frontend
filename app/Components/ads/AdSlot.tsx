'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdPlacement = 'post-run' | 'session-start';

type AdSlotProps = {
  placement: AdPlacement;
  /**
   * Must be true only for free-tier users (ads_free === false).
   * When false, this component renders nothing and never loads AdSense.
   */
  enabled: boolean;
  /** Fires when the ad unit has loaded, timed out, or was skipped. Not on click. */
  onLoaded?: () => void;
  className?: string;
};

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-5383317547226180';
const SLOT_BY_PLACEMENT: Record<AdPlacement, string> = {
  'post-run': process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '',
  'session-start': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || '',
};

/** Hard unlock so ad blockers / network failures never trap the composer. */
export const AD_LOAD_TIMEOUT_MS = 5000;

function ensureAdSenseScript(client: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing =
    document.querySelector<HTMLScriptElement>('script[data-analyzeit-adsense]') ||
    document.querySelector<HTMLScriptElement>('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
  if (existing) {
    return existing.dataset.loaded === '1' || typeof window.adsbygoogle !== 'undefined'
      ? Promise.resolve()
      : new Promise((resolve) => {
          existing.addEventListener('load', () => {
            existing.dataset.loaded = '1';
            resolve();
          }, { once: true });
          existing.addEventListener('error', () => resolve(), { once: true });
          // Already completed before we attached listeners
          if ((existing as HTMLScriptElement).src) {
            window.setTimeout(() => resolve(), 0);
          }
        });
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.crossOrigin = 'anonymous';
    script.dataset.analyzeitAdsense = '1';
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Sponsored AdSense unit — visually distinct from chat/tool cards.
 * Never mounts the AdSense script unless `enabled` and env slots are set.
 */
export function AdSlot({ placement, enabled, onLoaded, className = '' }: AdSlotProps) {
  const pushed = useRef(false);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'skipped'>('loading');
  const [showSkip, setShowSkip] = useState(false);
  const slot = SLOT_BY_PLACEMENT[placement];
  const configured = Boolean(CLIENT && slot);

  useEffect(() => {
    // Premium / ads_free: zero network calls — do not load googlesyndication.
    if (!enabled) {
      loadedRef.current = true;
      onLoaded?.();
      return;
    }

    let cancelled = false;
    const finish = (next: 'ready' | 'empty' | 'skipped' = configured ? 'ready' : 'empty') => {
      if (cancelled || loadedRef.current) return;
      loadedRef.current = true;
      setStatus(next);
      onLoaded?.();
    };

    const timer = window.setTimeout(() => finish(configured ? 'ready' : 'empty'), AD_LOAD_TIMEOUT_MS);
    const skipHint = window.setTimeout(() => {
      if (!cancelled && !loadedRef.current) setShowSkip(true);
    }, 2500);

    if (!configured) {
      finish('empty');
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        window.clearTimeout(skipHint);
      };
    }

    void (async () => {
      await ensureAdSenseScript(CLIENT);
      if (cancelled || pushed.current) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushed.current = true;
      } catch {
        // Ad blocker / CSP — still unlock UI
      }
      finish('ready');
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(skipHint);
    };
  }, [configured, enabled, onLoaded]);

  if (!enabled) return null;
  // Collapse empty / skipped so the dashed placeholder never eats the flex gap.
  if (status === 'empty' || status === 'skipped') return null;
  // Unconfigured slots: never paint a tall dashed box in prod.
  if (!configured && status !== 'loading') return null;

  return (
    <aside
      className={`ad-slot rounded-xl border border-dashed border-[#C4B5A5] dark:border-[#3A424E] bg-[#F7F0E6] dark:bg-[#161A20] px-3 py-3 ${className}`}
      data-placement={placement}
      data-sponsored="true"
      aria-label="Sponsored"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A7F74] dark:text-[#8B93A1]">
          Sponsored
        </span>
        <div className="flex items-center gap-2">
          {status === 'loading' && (
            <span className="text-[10px] text-[#8A7F74] dark:text-[#8B93A1]">Loading…</span>
          )}
          {(showSkip || status === 'loading') && (
            <button
              type="button"
              onClick={() => {
                if (loadedRef.current) {
                  onLoaded?.();
                  return;
                }
                loadedRef.current = true;
                setStatus('skipped');
                setShowSkip(false);
                onLoaded?.();
              }}
              className="text-[10px] font-medium text-[#8A7F74] underline underline-offset-2 hover:text-[#4A4238] dark:hover:text-[#EDEFF2]"
            >
              Skip
            </button>
          )}
        </div>
      </div>
      {configured ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: placement === 'session-start' ? 90 : 100 }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : null}
    </aside>
  );
}
