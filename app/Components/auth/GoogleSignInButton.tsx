'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { confirmAuthSession, loginWithGoogle } from '../../lib/auth';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number;
            },
          ) => void;
          prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type Props = {
  onSuccess: (meta?: { is_new?: boolean }) => void;
  onError?: (message: string) => void;
  /** Show One Tap / automatic sign-in prompt once GIS loads */
  enableOneTap?: boolean;
  context?: 'signin' | 'signup';
};

export function GoogleSignInButton({
  onSuccess,
  onError,
  enableOneTap = true,
  context = 'signin',
}: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (!response?.credential) {
        const msg = 'Google did not return a credential';
        setLocalError(msg);
        onError?.(msg);
        return;
      }
      setBusy(true);
      setLocalError('');
      try {
        const result = await loginWithGoogle(response.credential);
        await confirmAuthSession();
        onSuccess({ is_new: Boolean(result.is_new) });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Google sign-in failed';
        setLocalError(msg);
        onError?.(msg);
      } finally {
        setBusy(false);
      }
    },
    [onError, onSuccess],
  );

  const initGis = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      context,
      use_fedcm_for_prompt: true,
    });

    buttonRef.current.innerHTML = '';
    const width = Math.min(buttonRef.current.offsetWidth || 320, 400);
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: context === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
    });

    if (enableOneTap) {
      window.google.accounts.id.prompt();
    }
    setReady(true);
  }, [context, enableOneTap, handleCredential]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGis();
    }
  }, [initGis]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-[#5C534A]/80 dark:text-[#C5B9AE]">
        Google Sign-In is not configured for this environment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => initGis()}
      />
      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#4A4238]/12 dark:bg-[#3A3430]" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#4A4238]/45 dark:text-[#91867E]">
          or
        </span>
        <div className="h-px flex-1 bg-[#4A4238]/12 dark:bg-[#3A3430]" />
      </div>
      <div
        ref={buttonRef}
        className={`flex justify-center min-h-[44px] ${busy ? 'opacity-60 pointer-events-none' : ''}`}
        aria-busy={busy}
      />
      {!ready && !localError ? (
        <p className="text-center text-[11px] text-[#4A4238]/45 dark:text-[#91867E]">Loading Google…</p>
      ) : null}
      {busy ? (
        <p className="text-center text-[11px] font-mono text-[#E3836C]">Signing in with Google…</p>
      ) : null}
      {localError ? (
        <p className="text-center text-xs text-red-500 dark:text-[#D97870]">{localError}</p>
      ) : null}
    </div>
  );
}
