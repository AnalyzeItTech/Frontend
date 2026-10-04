'use client';

import { useEffect, useState } from 'react';
import { getRetentionUsage, type RetentionUsage } from '../../lib/billingApi';
import { getStoredToken } from '../../lib/auth';

function compact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function RetentionMeter() {
  const [usage, setUsage] = useState<RetentionUsage | null>(null);

  useEffect(() => {
    if (!getStoredToken()) return;
    let cancelled = false;
    getRetentionUsage()
      .then((row) => {
        if (!cancelled) setUsage(row);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) return null;
  const storedCap = usage.caps.retention_total_tokens || 1;
  const storedPct = Math.min(100, Math.round((usage.total_tokens / storedCap) * 100));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-4 py-3">
      <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Memory</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">
        {compact(usage.total_tokens)} / {compact(storedCap)} used
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-valuenow={storedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Memory used">
        <div className="h-full rounded-full bg-[#8FA98F]" style={{ width: `${storedPct}%` }} />
      </div>
      <a href="/memory" className="mt-2 inline-block text-xs underline underline-offset-2">Manage memory</a>
      {!usage.writes_allowed ? (
        <p className="mt-2 text-xs text-[#9B4D3B]">Stored memory is full. New writes are paused until you delete sources or upgrade. Existing memory stays.</p>
      ) : null}
      {!usage.enforce ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">Caps are measured and not enforced yet.</p>
      ) : null}
    </div>
  );
}
