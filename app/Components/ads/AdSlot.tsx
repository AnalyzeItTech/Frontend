'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdPlacement = 'post-run' | 'session-start' | 'video';

type AdSlotProps = {
  placement: AdPlacement;
  enabled: boolean;
  onLoaded?: () => void;
  /** Close / reclaim without unlocking a run (video Skip, or no fill). */
  onDismiss?: () => void;
  className?: string;
};

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';
const SLOT_BY_PLACEMENT: Record<AdPlacement, string> = {
  'post-run': process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || '',
  'session-start': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '',
  video: process.env.NEXT_PUBLIC_ADSENSE_SLOT_VIDEO || process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '',
};
const VIDEO_WATCH_SEC = 15;
const FILL_CHECK_MS = 2_500;
const FILL_TIMEOUT_MS = 8_000;

export const AD_LOAD_TIMEOUT_MS = 20_000;

/** True when AdSense client + slot env vars are set for this placement. */
export function isAdPlacementConfigured(placement: AdPlacement): boolean {
  return Boolean(CLIENT && SLOT_BY_PLACEMENT[placement]);
}

function ensureAdSenseScript(client: string): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  const existing =
    document.querySelector<HTMLScriptElement>('script[data-analyzeit-adsense]') ||
    document.querySelector<HTMLScriptElement>('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
  if (existing) {
    if (existing.dataset.loaded === '1' || typeof window.adsbygoogle !== 'undefined') {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      existing.addEventListener('load', () => {
        existing.dataset.loaded = '1';
        resolve(true);
      }, { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      window.setTimeout(() => resolve(typeof window.adsbygoogle !== 'undefined'), 2_000);
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
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function adLooksFilled(ins: HTMLElement | null): boolean {
  if (!ins) return false;
  const status = (ins.getAttribute('data-ad-status') || '').toLowerCase();
  if (status === 'unfilled') return false;
  if (status === 'filled') return true;
  const iframe = ins.querySelector('iframe');
  if (iframe) {
    const h = iframe.clientHeight || Number(iframe.getAttribute('height')) || 0;
    return h > 8;
  }
  return ins.clientHeight > 24;
}

/**
 * Renders an AdSense unit only when configured and a fill is detected.
 * No house/placeholder ads — if inventory is missing, the slot stays hidden
 * and callers get onLoaded/onDismiss so UI gates do not trap the user.
 */
export function AdSlot({ placement, enabled, onLoaded, onDismiss, className = '' }: AdSlotProps) {
  const pushed = useRef(false);
  const finishedRef = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const onLoadedRef = useRef(onLoaded);
  const onDismissRef = useRef(onDismiss);
  onLoadedRef.current = onLoaded;
  onDismissRef.current = onDismiss;

  const [phase, setPhase] = useState<'idle' | 'waiting' | 'filled' | 'gone'>('idle');
  const [remaining, setRemaining] = useState(placement === 'video' ? VIDEO_WATCH_SEC : 0);
  const slot = SLOT_BY_PLACEMENT[placement];
  const isVideo = placement === 'video';
  const isBanner = placement === 'session-start' || placement === 'post-run';
  const configured = Boolean(CLIENT && slot);

  const finishOk = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onLoadedRef.current?.();
  };

  const finishGone = () => {
    setPhase('gone');
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Callers unlock gates via onDismiss when there is nothing to show.
    onDismissRef.current?.();
  };

  useEffect(() => {
    finishedRef.current = false;
    pushed.current = false;

    if (!enabled) {
      finishedRef.current = true;
      onLoadedRef.current?.();
      setPhase('gone');
      return;
    }
    if (!configured) {
      finishGone();
      return;
    }

    let cancelled = false;
    let fillTimer: number | undefined;
    let hardTimer: number | undefined;
    let observer: MutationObserver | undefined;

    const tryFill = () => {
      if (cancelled) return false;
      const status = (insRef.current?.getAttribute('data-ad-status') || '').toLowerCase();
      if (status === 'unfilled' || (status === 'filled' && !adLooksFilled(insRef.current))) {
        finishGone();
        return false;
      }
      // Only a confirmed fill is shown. An iframe alone is not inventory.
      if (status === 'filled' && adLooksFilled(insRef.current)) {
        setPhase('filled');
        if (!isVideo) finishOk();
        return true;
      }
      return false;
    };

    setPhase('waiting');

    void (async () => {
      const scriptOk = await ensureAdSenseScript(CLIENT);
      if (cancelled) return;
      if (!scriptOk) {
        finishGone();
        return;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled) return;
      if (!pushed.current) {
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          pushed.current = true;
        } catch {
          finishGone();
          return;
        }
      }

      fillTimer = window.setTimeout(() => {
        if (!tryFill()) finishGone();
      }, FILL_CHECK_MS);

      hardTimer = window.setTimeout(() => {
        if (!tryFill()) finishGone();
      }, isVideo ? AD_LOAD_TIMEOUT_MS : FILL_TIMEOUT_MS);

      if (insRef.current && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
          tryFill();
        });
        observer.observe(insRef.current, {
          attributes: true,
          attributeFilter: ['data-ad-status', 'style', 'class'],
          childList: true,
          subtree: true,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (fillTimer) window.clearTimeout(fillTimer);
      if (hardTimer) window.clearTimeout(hardTimer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, enabled, isVideo, placement]);

  useEffect(() => {
    if (!enabled || !isVideo || phase !== 'filled') return;
    if (remaining <= 0) {
      finishOk();
      return;
    }
    const t = window.setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isVideo, remaining, phase]);

  if (!enabled || !configured || phase === 'gone' || phase === 'idle') {
    return null;
  }

  const skip = () => {
    finishedRef.current = true;
    setPhase('gone');
    onDismissRef.current?.();
  };

  const showChrome = phase === 'filled';

  return (
    <aside
      className={
        showChrome
          ? `ad-slot overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 ${className}`
          : 'pointer-events-none h-0 w-0 overflow-hidden opacity-0'
      }
      data-placement={placement}
      data-sponsored={showChrome ? 'true' : undefined}
      aria-label={showChrome ? 'Sponsored' : undefined}
      aria-hidden={!showChrome}
    >
      {showChrome ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Sponsored{isVideo ? ' · video' : ''}
          </span>
          <div className="flex items-center gap-2">
            {isVideo ? (
              <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                {remaining > 0 ? `${remaining}s to unlock` : 'Unlocked'}
              </span>
            ) : null}
            <button
              type="button"
              onClick={skip}
              className="text-[10px] font-medium text-[var(--text-muted)] underline underline-offset-2"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      <ins
        ref={insRef}
        className="adsbygoogle block w-full overflow-hidden"
        style={{
          display: 'block',
          width: showChrome ? '100%' : isBanner ? 728 : 300,
          height: isVideo ? 180 : 72,
          maxHeight: isVideo ? 180 : 72,
          overflow: 'hidden',
        }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={isBanner ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="false"
      />
    </aside>
  );
}
