'use client';

import React, { useState } from 'react';
import { IconBrandGithub } from '@tabler/icons-react';
import { safeNextPath, startGitHubAuth } from '../../lib/auth';

type Props = {
  onError?: (message: string) => void;
  context?: 'signin' | 'signup';
};

export function GitHubSignInButton({ onError, context = 'signin' }: Props) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleClick = async () => {
    setBusy(true);
    setLocalError('');
    try {
      const next = safeNextPath(new URLSearchParams(window.location.search).get('next'));
      await startGitHubAuth(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GitHub sign-in failed';
      setLocalError(msg);
      onError?.(msg);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="group flex items-center justify-center gap-2.5 w-full py-2.5 rounded-full border border-[#4A4238]/15 dark:border-[#504740] bg-white dark:bg-[#292522] text-sm font-medium text-[#4A4238] dark:text-[#F4EDE5] hover:bg-[#F7F2EC] dark:hover:bg-[#302B28] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-[#4A4238]/20 border-t-[#4A4238] dark:border-[#F4EDE5]/20 dark:border-t-[#F4EDE5] rounded-full animate-spin" />
            Redirecting to GitHub…
          </span>
        ) : (
          <>
            <IconBrandGithub size={18} stroke={1.75} />
            {context === 'signup' ? 'Sign up with GitHub' : 'Sign in with GitHub'}
          </>
        )}
      </button>
      {localError ? (
        <p className="text-center text-xs text-red-500 dark:text-[#D97870]">{localError}</p>
      ) : null}
    </div>
  );
}
