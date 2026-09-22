'use client';

import Link from 'next/link';
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
  /** Video only: close without unlocking a run. */
  onDismiss?: () => void;
  className?: string;
};

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';
const SLOT_BY_PLACEMENT: Record<AdPlacement, string> = {
  'post-run': process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || '',
  'session-start': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '',
  video: process.env.NEXT_PUBLIC_ADSENSE_SLOT_VIDEO || process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '',
};
const HOUSE_VIDEO = process.env.NEXT_PUBLIC_HOUSE_AD_VIDEO_URL || '';
const VIDEO_WATCH_SEC = 15;

export const AD_LOAD_TIMEOUT_MS = 20_000;

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
          window.setTimeout(() => resolve(), 400);
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

function HouseBanner() {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-1">
      <p className="min-w-0 text-[12px] leading-snug text-[var(--text-secondary)]">
        Free Chat is ad-supported.{' '}
        <Link href="/billing" className="font-medium text-[#E3836C] underline-offset-2 hover:underline">
          Go ad-free
        </Link>
      </p>
    </div>
  );
}

function HouseVideo() {
  return (
    <div className="flex aspect-video max-h-[200px] w-full max-w-[360px] flex-col justify-end rounded-lg bg-gradient-to-br from-[#E3836C]/25 to-[#C4B5A5]/20 p-3">
      <p className="font-serif text-sm text-[var(--text-primary)]">15s sponsored watch</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Stays in this card — never full screen.</p>
    </div>
  );
}

export function AdSlot({ placement, enabled, onLoaded, onDismiss, className = '' }: AdSlotProps) {
  const pushed = useRef(false);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'skipped'>('loading');
  const [remaining, setRemaining] = useState(placement === 'video' ? VIDEO_WATCH_SEC : 0);
  const slot = SLOT_BY_PLACEMENT[placement];
  const isVideo = placement === 'video';
  const isBanner = placement === 'session-start' || placement === 'post-run';
  const configured = Boolean(CLIENT && slot);

  useEffect(() => {
    if (!enabled) {
      loadedRef.current = true;
      onLoaded?.();
      return;
    }

    let cancelled = false;
    const finish = () => {
      if (cancelled || loadedRef.current) return;
      loadedRef.current = true;
      setStatus('ready');
      onLoaded?.();
    };

    const hard = window.setTimeout(finish, isVideo ? AD_LOAD_TIMEOUT_MS : 8_000);

    void (async () => {
      if (configured) {
        await ensureAdSenseScript(CLIENT);
        if (cancelled || pushed.current) return;
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          pushed.current = true;
        } catch {
          /* blockers */
        }
      }
      setStatus('ready');
      if (!isVideo) window.setTimeout(finish, 400);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(hard);
    };
  }, [configured, enabled, isVideo, onLoaded]);

  useEffect(() => {
    if (!enabled || !isVideo || status === 'skipped') return;
    if (remaining <= 0) {
      if (!loadedRef.current) {
        loadedRef.current = true;
        onLoaded?.();
      }
      return;
    }
    const t = window.setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [enabled, isVideo, remaining, status, onLoaded]);

  if (!enabled || status === 'skipped') return null;

  const skip = () => {
    loadedRef.current = true;
    setStatus('skipped');
    // Reclaim layout via onDismiss; video skip must not unlock Free runs.
    // Banner skip may complete a post-run gate without granting capacity.
    onDismiss?.();
    if (!isVideo) onLoaded?.();
  };

  return (
    <aside
      className={`ad-slot overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 ${className}`}
      data-placement={placement}
      data-sponsored="true"
      aria-label="Sponsored"
    >
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

      {configured ? (
        <ins
          className="adsbygoogle block w-full overflow-hidden"
          style={{
            display: 'block',
            width: '100%',
            height: isVideo ? 180 : 72,
            maxHeight: isVideo ? 180 : 72,
            overflow: 'hidden',
          }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format={isBanner ? 'horizontal' : 'rectangle'}
          data-full-width-responsive="false"
        />
      ) : HOUSE_VIDEO && isVideo ? (
        <video
          className="mx-auto max-h-[180px] w-full max-w-[360px] rounded-lg bg-black object-cover"
          src={HOUSE_VIDEO}
          autoPlay
          muted
          playsInline
          controls={false}
        />
      ) : isVideo ? (
        <HouseVideo />
      ) : (
        <HouseBanner />
      )}
    </aside>
  );
}
