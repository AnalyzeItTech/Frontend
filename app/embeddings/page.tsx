'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { deleteEmbeddedSource, fetchEmbeddedSources, fetchEmbeddingUsage, type EmbeddedSource, type EmbeddingUsage } from '../lib/embeddingsApi';

export default function EmbeddingsPage() {
  const [usage, setUsage] = useState<EmbeddingUsage | null>(null);
  const [sources, setSources] = useState<EmbeddedSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchEmbeddingUsage(), fetchEmbeddedSources()])
      .then(([u, s]) => {
        setUsage(u);
        setSources(s);
      })
      .catch(() => setError('Sign in to see embedding usage.'));
  }, []);

  const monthPct = usage ? Math.min(100, (usage.monthly_tokens_processed / Math.max(1, usage.monthly_cap)) * 100) : 0;
  const storePct = usage ? Math.min(100, (usage.storage_tokens_current / Math.max(1, usage.storage_cap)) * 100) : 0;

  return (
    <AppShell active="dashboard">
      <div className="px-[var(--gutter)] py-6 space-y-6 max-w-3xl">
        <PageTitle title="Embeddings" />
        {error ? <p className="text-sm">{error}</p> : null}
        {usage ? (
          <section className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-medium">This month</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {usage.monthly_tokens_processed.toLocaleString()} / {usage.monthly_cap.toLocaleString()} tokens · resets {usage.reset_at}
            </p>
            <div className="h-2 rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--coral)]" style={{ width: `${monthPct}%` }} /></div>
            <p className="text-xs text-[var(--text-muted)]">
              Stored {usage.storage_tokens_current.toLocaleString()} / {usage.storage_cap.toLocaleString()}
            </p>
            <div className="h-2 rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--coral)]" style={{ width: `${storePct}%` }} /></div>
            {(usage.warn_monthly || usage.warn_storage) ? (
              <p className="text-sm">You are at or above 80% of a cap. <Link href="/billing" className="underline">Review plan</Link></p>
            ) : null}
          </section>
        ) : null}
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Sources</h2>
          {sources.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No embedding jobs yet.</p> : null}
          {sources.map((source) => (
            <article key={source.job_id} className="rounded-xl border border-[var(--border)] p-3 text-sm flex justify-between gap-3">
              <div>
                <p>{source.source?.type || 'upload'} · {(source.tokens_processed || source.token_estimate || 0).toLocaleString()} tokens</p>
                <p className="text-xs text-[var(--text-muted)]">Last activity {source.last_accessed_at || '—'}</p>
                {source.evicted ? <p className="text-xs">Vectors were removed by storage retention. Re-embed to restore them.</p> : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-[var(--text-muted)]">{source.status}</span>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={async () => {
                    await deleteEmbeddedSource(source.job_id);
                    setSources((prev) => prev.filter((row) => row.job_id !== source.job_id));
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
