'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ObjectBuilderView } from '../Components/dashboard/ObjectBuilderView';
import { getProjects } from '../lib/chatApi';

export default function ObjectsPage() {
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
      <h1 className="mt-2 font-serif text-3xl">Custom objects</h1>
      <p className="mt-2 max-w-xl text-sm text-[#8B93A1]">
        Object schemas live here so the dashboard can stay a display of saved widgets.
      </p>
      <Link href="/Dashboard" className="mt-4 inline-block text-sm text-[#3D6FE0]">
        Back to dashboard
      </Link>
      {error ? <p className="mt-4 text-sm text-[#EF6C6C]">{error}</p> : null}
      <div className="mt-6">{projectId ? <ObjectBuilderView projectId={projectId} /> : <p>Loading workspace…</p>}</div>
    </main>
  );
}
