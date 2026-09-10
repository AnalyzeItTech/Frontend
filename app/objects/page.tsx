'use client';

import { useEffect, useState } from 'react';
import { ObjectBuilderView } from '../Components/dashboard/ObjectBuilderView';
import { getProjects } from '../lib/chatApi';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';

export default function ObjectsPage() {
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjects()
      .then((rows) => setProjectId(rows[0]?.id || ''))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AppShell active="dashboard">
      <PageTitle title="Custom objects" />
      <p className="mt-2 max-w-xl text-sm text-[#6B6155]">
        Object schemas live here so the dashboard can stay a display of saved widgets.
      </p>
      {error ? <p className="mt-4 text-sm text-[#9B4D3B]">{error}</p> : null}
      <div className="app-card mt-6 p-4">{projectId ? <ObjectBuilderView projectId={projectId} /> : <p>Loading workspace…</p>}</div>
    </AppShell>
  );
}
