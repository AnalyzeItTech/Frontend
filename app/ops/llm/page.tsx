'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAdminWhoami } from '../../lib/feedbackApi';
import { getAuthHeaders, getStoredToken } from '../../lib/auth';

type TargetRow = {
  calls: number;
  ok: number;
  success_rate: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  last_error: string | null;
};
type LlmStatus = {
  window: number;
  targets: Record<string, TargetRow>;
  circuit_open: Record<string, number>;
};

function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

function ms(n: number | null): string {
  return n == null ? '—' : `${Math.round(n)} ms`;
}

export default function LlmHealthPage() {
  const router = useRouter();
  const [data, setData] = useState<LlmStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/llm-status', { headers: getAuthHeaders() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`);
      setData(body as LlmStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load LLM status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/ops/llm');
      return;
    }
    fetchAdminWhoami()
      .then((who) => (who?.is_admin ? load() : setError('This account is not on the admin allowlist.')))
      .catch(() => setError('Could not verify admin access.'))
      .finally(() => setLoading(false));
  }, [router, load]);

  const rows = data ? Object.entries(data.targets) : [];
  const open = data ? Object.entries(data.circuit_open) : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">LLM provider health</h1>
          <p className="text-sm opacity-70">Recent window of Model router calls (success rate and latency per target).</p>
        </div>
        <button type="button" onClick={load} className="rounded-md border px-3 py-1.5 text-sm" disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error ? (
        <p role="alert" className="rounded-md border border-red-500/40 p-3 text-sm">
          {error}
        </p>
      ) : null}

      {open.length > 0 ? (
        <section aria-label="Open circuit breakers" className="rounded-md border border-amber-500/50 p-3 text-sm">
          <h2 className="font-medium">Skipped right now (circuit open)</h2>
          <ul className="mt-1 list-disc pl-5">
            {open.map(([target, secs]) => (
              <li key={target}>
                <span className="font-mono">{target}</span> — retry in ~{Math.round(secs)}s
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Per-target LLM call statistics</caption>
          <thead>
            <tr className="border-b text-xs uppercase opacity-70">
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Calls</th>
              <th className="py-2 pr-4">Success</th>
              <th className="py-2 pr-4">p50</th>
              <th className="py-2 pr-4">p95</th>
              <th className="py-2">Last error</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center opacity-60">
                  No LLM calls recorded yet (the window resets when the Model scales to zero).
                </td>
              </tr>
            ) : null}
            {rows.map(([target, r]) => (
              <tr key={target} className="border-b align-top">
                <td className="py-2 pr-4 font-mono">{target}</td>
                <td className="py-2 pr-4">{r.calls}</td>
                <td className="py-2 pr-4">{pct(r.success_rate)}</td>
                <td className="py-2 pr-4">{ms(r.p50_ms)}</td>
                <td className="py-2 pr-4">{ms(r.p95_ms)}</td>
                <td className="py-2 text-xs opacity-70">{r.last_error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
