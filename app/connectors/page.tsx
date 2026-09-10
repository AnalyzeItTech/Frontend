'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConnectorsView } from '../Components/dashboard/ConnectorsView';
import { getProjects } from '../lib/chatApi';

export default function ConnectorsPage() {
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjects()
      .then((rows) => setProjectId(rows[0]?.id || ''))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0D10] p-6 text-[#EDEFF2]">
      <p className="text-xs uppercase tracking-widest text-[#8B93A1]">Not the dashboard</p>
      <h1 className="mt-2 font-serif text-3xl">Connectors</h1>
      <p className="mt-2 max-w-xl text-sm text-[#8B93A1]">
        Connector setup is separate from the dashboard. The canvas only displays data you have already connected.
      </p>
      <Link href="/Dashboard" className="mt-4 inline-block text-sm text-[#3D6FE0]">
        Back to dashboard
      </Link>
      {error ? <p className="mt-4 text-sm text-[#EF6C6C]">{error}</p> : null}
      <div className="mt-6">{projectId ? <ConnectorsView projectId={projectId} /> : <p>Loading workspace…</p>}</div>
    </main>
  );
}
