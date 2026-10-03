'use client';

import React from 'react';
import Link from 'next/link';
import { describeChange, formatValue, type ChangeProposal } from '../../lib/dataChange.mjs';

export type DataChangeStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'error';

/** Review card for a change the assistant wants to make: before/after, then Approve or Reject. */
export function DataChangeCard({
  projectId,
  proposal,
  status,
  error,
  onApprove,
  onReject,
}: {
  projectId: string;
  proposal: ChangeProposal;
  status: DataChangeStatus;
  error?: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const d = describeChange(proposal);
  const busy = status === 'applying';
  const done = status === 'applied' || status === 'rejected';
  return (
    <div role="group" aria-label="Proposed data change" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Proposed change · needs your approval</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{d.headline}</p>

      {d.rows.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Fields this change affects</caption>
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th scope="col" className="py-1 pr-3 font-medium">Field</th>
                <th scope="col" className="py-1 pr-3 font-medium">{d.action === 'create' ? '' : 'Now'}</th>
                <th scope="col" className="py-1 font-medium">{d.action === 'delete' ? '' : 'After'}</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.field} className={r.changed ? '' : 'opacity-60'}>
                  <th scope="row" className="py-1 pr-3 text-left font-mono font-normal text-[var(--text-muted)]">{r.field}</th>
                  <td className={`py-1 pr-3 ${d.action === 'delete' ? 'line-through' : ''}`}>{d.action === 'create' ? '' : formatValue(r.before)}</td>
                  <td className="py-1 font-medium text-[var(--text-primary)]">{d.action === 'delete' ? '' : formatValue(r.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {d.notes.map((n) => (
        <p key={n} className="mt-2 text-xs text-[var(--text-muted)]">{n}</p>
      ))}

      {status === 'applied' ? (
        <p role="status" className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          Applied. <Link href={`/objects?project=${encodeURIComponent(projectId)}`} className="underline underline-offset-2">Open in Objects</Link>
        </p>
      ) : status === 'rejected' ? (
        <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">Rejected. Nothing was changed.</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" disabled={busy || !d.canApprove} onClick={onApprove} className="btn-primary text-xs disabled:opacity-50">
            {busy ? 'Applying…' : 'Approve'}
          </button>
          <button type="button" disabled={busy || done} onClick={onReject} className="btn-secondary text-xs disabled:opacity-50">Reject</button>
        </div>
      )}
      {status === 'error' && error ? <p role="alert" className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
