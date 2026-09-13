'use client';

import { useCallback, useEffect, useState } from 'react';
import { ObjectBuilderView } from '../Components/dashboard/ObjectBuilderView';
import { getProjects } from '../lib/chatApi';
import { redactClientError } from '../lib/apiErrors';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { WorkspaceStatus } from '../Components/app/WorkspaceStatus';
import Link from 'next/link';
import { IconArrowRight, IconBraces, IconPlus } from '@tabler/icons-react';

const LOAD_TIMEOUT_MS = 12000;

export default function ObjectsPage() {
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
        setErrorBody(redactClientError(err, 'Couldn’t load custom objects.'));
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <AppShell active="objects">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageTitle title="Objects" />
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Shape repeatable business records once, then use those objects across dashboards and research.
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary w-fit gap-2 px-5 text-sm">
          <IconPlus size={16} /> Create an object
        </Link>
      </div>
      <WorkspaceStatus
        status={status}
        loadingLabel="Loading object schemas…"
        emptyTitle="Design your first object"
        emptyBody="Create a project, then define a reusable object — like Customer, Subscription, or Experiment."
        emptyPrimary={{ href: '/dashboard', label: 'Create a project' }}
        errorTitle="Couldn’t load objects"
        errorBody={errorBody}
        onRetry={load}
      >
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            {projectId ? <ObjectBuilderView projectId={projectId} /> : null}
          </div>
          <aside className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]"><IconBraces size={22} /></div>
            <p className="mt-4 font-serif text-xl text-[var(--text-primary)]">Sample object</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Illustrative schema preview</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/55 text-xs">
              {['name · text · required', 'plan · select', 'mrr · number', 'renewal date · date'].map((field) => (
                <div key={field} className="border-b border-[var(--border)] px-3 py-2.5 last:border-b-0 font-mono text-[11px] text-[var(--text-secondary)]">{field}</div>
              ))}
            </div>
            <Link href="/dashboard" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--coral)] hover:underline">
              Build this object <IconArrowRight size={15} />
            </Link>
          </aside>
        </div>
      </WorkspaceStatus>
    </AppShell>
  );
}
