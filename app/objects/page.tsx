'use client';

import { useCallback, useEffect, useState } from 'react';
import { ObjectBuilderView } from '../Components/dashboard/ObjectBuilderView';
import { getProjects } from '../lib/chatApi';
import { redactClientError } from '../lib/apiErrors';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { WorkspaceStatus } from '../Components/app/WorkspaceStatus';

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
      <PageTitle title="Custom objects" />
      <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
        Object schemas live here so the dashboard can stay a display of saved widgets.
      </p>
      <WorkspaceStatus
        status={status}
        loadingLabel="Loading object schemas…"
        emptyTitle="No workspace yet"
        emptyBody="Create a project on the dashboard, then define custom objects here."
        emptyPrimary={{ href: '/dashboard', label: 'Go to dashboard' }}
        errorTitle="Couldn’t load objects"
        errorBody={errorBody}
        onRetry={load}
      >
        <div className="app-card mt-6 p-4">
          {projectId ? <ObjectBuilderView projectId={projectId} /> : null}
        </div>
      </WorkspaceStatus>
    </AppShell>
  );
}
