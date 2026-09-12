'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AUTH_REQUEST_TIMEOUT_MS,
  confirmAuthSession,
  getStoredToken,
  safeNextPath,
  setAuthSession,
  type AuthResult,
  type UserProfile,
} from '../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

type FinishAuth = { kind: 'auth' } & AuthResult;
type FinishConnector = { kind: 'connector'; connector: { id?: string } };
type FinishResult = FinishAuth | FinishConnector;

async function finishGitHubOAuth(code: string, state: string): Promise<FinishResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_V1}/oauth/github/finish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, state }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'GitHub OAuth failed' }));
      throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'GitHub OAuth failed');
    }
    return (await res.json()) as FinishResult;
  } finally {
    clearTimeout(timeoutId);
  }
}

function GitHubOAuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Completing GitHub…');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const ghError = params.get('error_description') || params.get('error');

    if (ghError) {
      setError(ghError);
      return;
    }
    if (!code || !state) {
      setError('Missing GitHub authorization response. Please try again.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await finishGitHubOAuth(code, state);
        if (cancelled) return;

        if (result.kind === 'connector') {
          setStatus('GitHub connected. Returning to connectors…');
          const dest = '/connectors?connected=github';
          if (window.opener && !window.opener.closed) {
            window.opener.location.href = dest;
            window.close();
            return;
          }
          router.replace(dest);
          return;
        }

        setAuthSession(result.token, result.user as UserProfile);
        await confirmAuthSession();
        if (result.is_new) {
          sessionStorage.setItem('analyzeit_auth_is_new', '1');
        }
        const next = safeNextPath(params.get('next'));
        router.replace(next.startsWith('/login') ? '/research' : next);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'GitHub sign-in failed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F3EDE4] dark:bg-[#171514] px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-600 dark:text-[#D97870] max-w-md">{error}</p>
          <Link
            href="/login"
            className="text-xs font-mono uppercase tracking-wider text-[#E3836C] hover:text-[#ED967F]"
          >
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E3836C]/25 border-t-[#E3836C]" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
            {status}
          </p>
        </>
      )}
    </div>
  );
}

export default function GitHubOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3EDE4] dark:bg-[#171514]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E3836C]/25 border-t-[#E3836C]" />
        </div>
      }
    >
      <GitHubOAuthInner />
    </Suspense>
  );
}
