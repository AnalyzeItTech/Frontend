'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectorsView } from '../Components/dashboard/ConnectorsView';
import { getProjects } from '../lib/chatApi';
import { redactClientError } from '../lib/apiErrors';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { WorkspaceStatus } from '../Components/app/WorkspaceStatus';

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
    <AppShell active="dashboard">
      <PageTitle title="Connectors" />
      <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
        Connect Stripe or Salesforce so the dashboard can display data you already trust. Setup
        lives here — the canvas only shows what you have connected.
      </p>
      <WorkspaceStatus
        status={status}
        loadingLabel="Loading connectors…"
        emptyTitle="Create a project first"
        emptyBody="Connectors attach to a workspace. Start a project, then return here to connect sources."
        emptyPrimary={{ href: '/dashboard', label: 'Go to dashboard' }}
        errorTitle="Couldn’t load connectors"
        errorBody={errorBody}
        onRetry={load}
      >
        <div className="app-card mt-6 p-4">
          {projectId ? <ConnectorsView projectId={projectId} /> : null}
        </div>
      </WorkspaceStatus>
      <p className="mt-6 text-sm text-[var(--text-muted)]">
        <Link href="/security" className="text-[#E3836C] hover:underline">
          Learn about connectors and read-only access
        </Link>
      </p>
    </AppShell>
  );
}
