'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cancelEmbeddingJob, estimateEmbedding, fetchEmbeddingJob, type EmbeddingJob } from '../../lib/embeddingsApi';

function formatEta(seconds?: number | null) {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)} min`;
}

export function EmbeddingJobProgress({ jobId, onJob }: { jobId: string | null; onJob?: (job: EmbeddingJob) => void }) {
  const [job, setJob] = useState<EmbeddingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const next = await fetchEmbeddingJob(jobId);
        if (stop) return;
        setJob(next);
        onJob?.(next);
      } catch {
        if (!stop) setError('Could not load this embedding job.');
      }
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [jobId, onJob]);

  if (!jobId) return null;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!job) return <p className="text-sm text-[var(--text-muted)]">Checking your file…</p>;

  const terminal = job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled';
  const label =
    job.status === 'queued'
      ? 'Waiting to start…'
      : job.status === 'chunking'
        ? `Preparing ${job.shards_total || 0} parallel workers…`
        : job.status === 'complete'
          ? 'Embedding complete'
          : job.status === 'failed' || job.status === 'cancelled'
            ? job.error || job.status
            : `${job.tokens_processed.toLocaleString()} / ${job.token_estimate.toLocaleString()} tokens`;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        {!terminal && job.eta_seconds ? <span className="text-[var(--text-muted)]">ETA {formatEta(job.eta_seconds)}</span> : null}
      </div>
      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
        <div className="h-full bg-[var(--coral)]" style={{ width: `${job.percent || 0}%` }} />
      </div>
      {job.tier === 3 && job.shards_total ? (
        <p className="text-xs text-[var(--text-muted)]">{job.shards_done || 0} / {job.shards_total} workers done</p>
      ) : null}
      {process.env.NEXT_PUBLIC_EMBED_DEBUG === '1' ? (
        <p className="text-xs text-[var(--text-muted)]">Tier {job.tier} · {job.embedding_model}</p>
      ) : null}
      {job.status === 'complete' ? (
        <Link href="/embeddings" className="text-xs underline">View embedded sources</Link>
      ) : null}
      {!terminal ? (
        <button type="button" className="text-xs underline" onClick={() => cancelEmbeddingJob(job.job_id)}>Cancel</button>
      ) : null}
    </div>
  );
}

export function EmbeddingEstimateButton({ text }: { text: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [quota, setQuota] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-primary text-xs"
        onClick={async () => {
          setQuota(null);
          try {
            const res = await estimateEmbedding(text);
            setJobId(res.job?.job_id || null);
          } catch (err: unknown) {
            const detail = (err as { detail?: { error?: string; monthly_tokens_processed?: number; monthly_cap?: number; reset_at?: string } }).detail;
            if (detail?.error === 'quota_exceeded') {
              setQuota(`Monthly embedding quota reached (${detail.monthly_tokens_processed?.toLocaleString()} / ${detail.monthly_cap?.toLocaleString()}). Resets ${detail.reset_at}. Upgrade to continue.`);
            } else {
              setQuota('Could not start embedding.');
            }
          }
        }}
      >
        Embed
      </button>
      {quota ? <p className="text-sm">{quota} <Link href="/billing" className="underline">Upgrade</Link></p> : null}
      <EmbeddingJobProgress jobId={jobId} />
    </div>
  );
}
