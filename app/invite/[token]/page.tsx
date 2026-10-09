'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '../../lib/auth';
import { acceptInvite, readInvite } from '../../lib/teamApi';
import { acceptErrorMessage, loginPathFor, VIEWER_CAN, VIEWER_CANNOT } from '../../lib/teamView.mjs';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<{ project_name: string; email_hint: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredToken()));
    let live = true;
    readInvite(token)
      .then((d) => live && setInfo(d))
      .catch(() => live && setError('This invitation is not valid any more. Ask for a new one.'));
    return () => {
      live = false;
    };
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const { project_id } = await acceptInvite(token);
      router.replace(`/project/${project_id}`);
    } catch (err) {
      setError(acceptErrorMessage(err as { status?: number; message?: string }));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-[var(--text-primary)]">
      {info ? (
        <div className="space-y-5">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Invitation</p>
          <h1 className="font-serif text-3xl">Join {info.project_name} on AnalyzeIt</h1>
          <p className="text-sm text-[var(--text-muted)]">This invitation was sent to {info.email_hint}. Sign in with that address to accept it.</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <ul className="list-disc space-y-1 pl-4">
              {VIEWER_CAN.map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <ul className="list-disc space-y-1 pl-4 text-[var(--text-muted)]">
              {VIEWER_CANNOT.map((t: string) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          {signedIn ? (
            <button type="button" disabled={busy} onClick={() => void accept()} className="btn-primary disabled:opacity-50">
              {busy ? 'Joining…' : 'Accept and open the project'}
            </button>
          ) : (
            <Link href={loginPathFor(token)} className="btn-primary inline-block">
              Sign in to accept
            </Link>
          )}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 text-sm">
          {error}
        </p>
      ) : null}
      {!info && !error ? <p className="text-sm text-[var(--text-muted)]">Opening the invitation…</p> : null}
    </main>
  );
}
