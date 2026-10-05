'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { RetentionMeter } from '../Components/billing/RetentionMeter';
import { MemorySourceRow } from '../Components/memory/MemorySourceRow';
import { fetchEmbeddedSources, fetchEmbeddingJob, type EmbeddingJob } from '../lib/embeddingsApi';
import {
  exportMemory,
  getMemoryWarnings,
  listMemorySources,
  type MemorySource,
} from '../lib/memoryApi';

export default function MemoryPage() {
  const [rows, setRows] = useState<MemorySource[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<{ stored: string | null; hot: string | null }>({ stored: null, hot: null });
  const [meterKey, setMeterKey] = useState(0);
  const [jobs, setJobs] = useState<EmbeddingJob[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await listMemorySources(q));
      setWarn(await getMemoryWarnings());
      setMeterKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load memory');
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while something is embedding, so an idle page makes no extra requests.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const sources = await fetchEmbeddedSources();
        const active = sources.filter((x) => ['queued', 'processing', 'chunking'].includes(x.status ?? ''));
        const rows = await Promise.all(active.map((x) => fetchEmbeddingJob(x.job_id)));
        if (stop) return;
        setJobs(rows);
        if (rows.length) timer = setTimeout(tick, 5000);
      } catch {
        /* progress is best-effort */
      }
    };
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [rows.length]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const pct = warn.stored;

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageTitle title="What AnalyzeIt remembers" />
        <p className="text-sm text-[var(--text-muted)]">
          Everything you add is kept and used when you ask. Rename a source so you recognise it, see what was stored, and delete anything you do not want kept. Nothing is deleted without you.
        </p>
        <RetentionMeter key={meterKey} />
        {pct ? (
          <p role="status" className="rounded-xl bg-[#C9A66B]/20 px-3 py-2 text-sm">
            You have used over {pct} of your memory allowance.{' '}
            <Link href="/billing" className="underline underline-offset-2">Upgrade or add capacity</Link>
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-[#9B4D3B]/10 px-3 py-2 text-sm text-[#9B4D3B]">{error}</p>
        ) : null}
        {jobs.map((j) => (
          <div key={j.job_id} className="app-card p-3 text-sm" role="status">
            <p className="text-[var(--text-primary)]">
              Embedding: {Math.round(j.percent)}%
              {j.shards_total ? ` · ${j.shards_done ?? 0}/${j.shards_total} parts` : ''}
              {j.eta_seconds ? ` · about ${Math.max(1, Math.round(j.eta_seconds / 60))} min left` : ''}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full rounded-full bg-[#6E8CA0]" style={{ width: `${j.percent}%` }} />
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your sources"
            aria-label="Filter sources"
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button type="button" className="btn-secondary text-xs" onClick={() => run(exportMemory)}>
            Export
          </button>
        </div>
        <ul className="app-card divide-y divide-[var(--border)]">
          {rows.length === 0 ? (
            <li className="p-4 text-sm text-[var(--text-muted)]">No stored sources yet.</li>
          ) : (
            rows.map((r) => <MemorySourceRow key={r.id} row={r} onChanged={() => void load()} onError={setError} />)
          )}
        </ul>
      </div>
    </AppShell>
  );
}
