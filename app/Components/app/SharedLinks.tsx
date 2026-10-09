'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuthHeaders } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ShareRow {
  token: string;
  path: string;
  title: string;
  created_at: string | null;
  expires_at: string | null;
  view_count: number;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '');

/** Links the signed-in user has made from answers: copy or turn off. Turning off takes effect immediately. */
export function SharedLinks() {
  const [rows, setRows] = useState<ShareRow[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/v1/shares`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      setRows(((await res.json()) as { shares: ShareRow[] }).shares);
      setError('');
    } catch {
      setError('Could not load your shared links.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const turnOff = async (token: string) => {
    try {
      const res = await fetch(`${API}/v1/shares/${encodeURIComponent(token)}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      setRows((prev) => (prev || []).filter((r) => r.token !== token));
    } catch {
      setError('Could not turn that link off. Try again.');
    }
  };

  const copy = async (row: ShareRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${row.path}`);
      setCopied(row.token);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Shared links</h2>
      <p className="text-xs text-[var(--text-muted)]">Anyone with a link can read that answer until it expires or you turn it off.</p>
      {error ? <p className="text-xs text-[var(--danger,#B3402A)]">{error}</p> : null}
      {rows && rows.length === 0 && !error ? (
        <div className="app-card p-5 text-sm text-[var(--text-muted)]">No links yet. Use Share under an answer in Research.</div>
      ) : null}
      <ul className="space-y-2 text-sm">
        {(rows || []).map((r) => (
          <li key={r.token} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate">{r.title || 'AnalyzeIt report'}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {r.view_count} view{r.view_count === 1 ? '' : 's'} · expires {fmt(r.expires_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => void copy(r)}>
                {copied === r.token ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => void turnOff(r.token)}>
                Turn off
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
