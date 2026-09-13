'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectorsView } from '../Components/dashboard/ConnectorsView';
import { getProjects } from '../lib/chatApi';
import { redactClientError } from '../lib/apiErrors';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { WorkspaceStatus } from '../Components/app/WorkspaceStatus';
import { IconArrowRight, IconDatabase, IconPlugConnected, IconShieldLock } from '@tabler/icons-react';

const LOAD_TIMEOUT_MS = 12000;

export default function ConnectorsPage() {
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'empty' | 'error' | 'content'>('loading');
  const [errorBody, setErrorBody] = useState<string | undefined>();

  const load = useCallback(() => {
    setStatus('loading');
    setErrorBody(undefined);
    setProjectId('');
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setStatus('error');
        setErrorBody('This is taking longer than expected. Check your connection and try again.');
      }
    }, LOAD_TIMEOUT_MS);

    getProjects()
      .then((rows) => {
        if (cancelled) return;
        const id = rows[0]?.id || '';
        setProjectId(id);
        setStatus(id ? 'content' : 'empty');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setErrorBody(redactClientError(err, 'Couldn’t load connectors.'));
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <AppShell active="connectors">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageTitle title="Connectors" />
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Bring trusted data into your workspace. Every connection is read-only by default and its credentials stay vault-encrypted.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <IconShieldLock size={15} className="text-[var(--coral)]" />
          Read-only + encrypted
        </div>
      </div>
      <WorkspaceStatus
        status={status}
        loadingLabel="Loading connectors…"
        emptyTitle="Give your workspace a source"
        emptyBody="Create a project first, then connect a provider. Your first sync stays read-only until you choose what to use."
        emptyPrimary={{ href: '/dashboard', label: 'Create a project' }}
        errorTitle="Couldn’t load connectors"
        errorBody={errorBody}
        onRetry={load}
      >
        <div className="app-card mt-6 p-4">
          {projectId ? <ConnectorsView projectId={projectId} /> : null}
        </div>
      </WorkspaceStatus>
      <section className="mt-8 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]"><IconPlugConnected size={22} /></div>
            <div>
              <p className="font-serif text-xl text-[var(--text-primary)]">What “live” looks like</p>
              <p className="text-xs text-[var(--text-muted)]">Illustrative preview — no data is connected here.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium"><IconDatabase size={16} /> Revenue warehouse</span>
              <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">Connected</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">12 read-only tables · last checked 4 minutes ago · ready for widget bindings</p>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-serif text-xl text-[var(--text-primary)]">Built for careful access</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">OAuth previews are labelled honestly; SQL connections are tested before they are saved.</p>
          <Link href="/security" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--coral)] hover:underline">
            Learn about read-only access <IconArrowRight size={15} />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
