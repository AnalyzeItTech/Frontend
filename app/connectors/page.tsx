'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectorsView } from '../Components/dashboard/ConnectorsView';
import { getProjects } from '../lib/chatApi';
import { redactClientError } from '../lib/apiErrors';
import { pickScopedProject } from '../lib/projectHome.mjs';
import { readConnectorCallback, type ConnectorCallback } from '../lib/connectorState.mjs';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { WorkspaceStatus } from '../Components/app/WorkspaceStatus';
import { IconArrowRight, IconShieldLock } from '@tabler/icons-react';

const LOAD_TIMEOUT_MS = 12000;

function ConnectorsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('project') || params.get('projectId') || '';
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'empty' | 'error' | 'content'>('loading');
  const [errorBody, setErrorBody] = useState<string | undefined>();
  const parsedNotice = readConnectorCallback(params);
  const [notice, setNotice] = useState<ConnectorCallback | null>(parsedNotice.kind === 'none' ? null : parsedNotice);
  if (
    parsedNotice.kind !== 'none'
    && (notice?.kind !== parsedNotice.kind || notice.provider !== parsedNotice.provider || notice.message !== parsedNotice.message)
  ) {
    setNotice(parsedNotice);
  }

  useEffect(() => {
    const parsed = readConnectorCallback(params);
    if (parsed.kind === 'none') return;
    const next = new URLSearchParams(params.toString());
    for (const key of ['connected', 'error', 'error_description', 'connector_error', 'oauth_error', 'connected_error', 'code', 'state']) {
      next.delete(key);
    }
    const callbackStatus = next.get('status');
    if (callbackStatus && (callbackStatus.toLowerCase() === 'error' || callbackStatus.toLowerCase() === 'failed')) {
      next.delete('status');
    }
    const qs = next.toString();
    router.replace(qs ? `/connectors?${qs}` : '/connectors', { scroll: false });
  }, [params, router]);

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
        const picked = pickScopedProject(rows, requested);
        if (picked.status === 'missing') {
          setProjectId('');
          setStatus('error');
          setErrorBody('That project isn’t in your workspace, so connectors stay closed.');
          return;
        }
        setProjectId(picked.projectId);
        setStatus(picked.status === 'empty' ? 'empty' : 'content');
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
  }, [requested]);

  useEffect(() => {
    return load();
  }, [load]);

  return (
    <AppShell active="connectors">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <PageTitle title="Connectors" />
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Bring trusted data into your workspace. AnalyzeIt only ever reads from your sources, and you stay in control of each connection: edit it, re-sync it, or revoke it at any time. Credentials stay vault-encrypted.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <IconShieldLock size={15} className="text-[var(--coral)]" />
          Reads only · you manage the connection
        </div>
      </div>
      <WorkspaceStatus
        status={status}
        loadingLabel="Loading connectors…"
        emptyTitle="Give your workspace a source"
        emptyBody="Create a project first, then connect a provider. AnalyzeIt reads your data and never writes to it, and you can disconnect whenever you like."
        emptyPrimary={{ href: '/dashboard', label: 'Create a project' }}
        errorTitle="Couldn’t load connectors"
        errorBody={errorBody}
        onRetry={load}
      >
        <div className="app-card mt-6 p-4">
          {projectId ? <ConnectorsView projectId={projectId} notice={notice} /> : null}
        </div>
      </WorkspaceStatus>
      <section className="mt-8">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-serif text-xl text-[var(--text-primary)]">Built for careful access</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">Queries are limited to a single SELECT, SQLite opens read-only and Postgres runs in a read-only transaction. Revoking a connection also revokes access at the provider where supported.</p>
          <Link href="/security" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--coral)] hover:underline">
            How access is protected <IconArrowRight size={15} />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-sm">Loading connectors…</main>}>
      <ConnectorsPageInner />
    </Suspense>
  );
}
