'use client';

import React from 'react';
import Link from 'next/link';
import { formatValue } from '../../lib/dataChange.mjs';
import { bulkHeadline, bulkNotes, bulkResultLine, bulkTransitions, undoResultLine, type BulkProposal } from '../../lib/bulkChange.mjs';

export type BulkChangeStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'undoing' | 'undone' | 'error';

/**
 * Review card for a change to many records: what it does in one sentence, how many records and which ones (a sample), the
 * before and after for each field, then Approve or Reject. After approval it says exactly what happened and offers Undo.
 */
export function BulkChangeCard({
  projectId,
  proposal,
  status,
  result,
  error,
  onApprove,
  onReject,
  onUndo,
}: {
  projectId: string;
  proposal: BulkProposal;
  status: BulkChangeStatus;
  result?: { changed?: number; skipped?: number; restored?: number; left_alone?: number } | null;
  error?: string | null;
  onApprove: () => void;
  onReject: () => void;
  onUndo: () => void;
}) {
  const busy = status === 'applying' || status === 'undoing';
  const transitions = bulkTransitions(proposal);
  const fields = Array.from(new Set(proposal.sample.flatMap((r) => r.changes.map((c) => c.field))));
  const decided = status === 'applied' || status === 'rejected' || status === 'undoing' || status === 'undone';
  return (
    <div role="group" aria-label="Proposed change to many records" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Proposed change to many records · needs your approval</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{bulkHeadline(proposal)}</p>
      {proposal.where.length ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Records where {proposal.where.join(' and ')} ({proposal.matched} match).
        </p>
      ) : null}

      {proposal.action === 'update' && transitions.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-[var(--text-primary)]">
          {transitions.map((t) => (
            <li key={t.field}>
              <span className="font-mono text-[var(--text-muted)]">{t.field}</span>: {t.from} <span aria-hidden="true">→</span>
              <span className="sr-only"> becomes </span> <span className="font-medium">{t.to}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {proposal.sample.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">A sample of the records this change affects</caption>
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th scope="col" className="py-1 pr-3 font-medium">Record</th>
                {fields.map((f) => (
                  <th key={f} scope="col" className="py-1 pr-3 font-mono font-normal">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposal.sample.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="py-1 pr-3 text-left font-normal text-[var(--text-primary)]">{r.label || r.id}</th>
                  {fields.map((f) => {
                    const c = r.changes.find((x) => x.field === f);
                    return (
                      <td key={f} className="py-1 pr-3">
                        {c ? (
                          proposal.action === 'delete' ? (
                            <span className="line-through opacity-70">{formatValue(c.before, 40)}</span>
                          ) : (
                            <>
                              <span className="opacity-70">{formatValue(c.before, 40)}</span> <span aria-hidden="true">→</span>
                              <span className="sr-only"> becomes </span> <span className="font-medium text-[var(--text-primary)]">{formatValue(c.after, 40)}</span>
                            </>
                          )
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {(status === 'undone' ? [] : bulkNotes(proposal)).map((n) => (
        <p key={n} className="mt-2 text-xs text-[var(--text-muted)]">{n}</p>
      ))}

      {status === 'applied' || status === 'undoing' ? (
        <div role="status" className="mt-3 text-xs">
          <p className="text-emerald-700 dark:text-emerald-400">
            {bulkResultLine(result)}{' '}
            <Link href={`/objects?project=${encodeURIComponent(projectId)}`} className="underline underline-offset-2">Open in Objects</Link>
          </p>
          <button type="button" disabled={busy} onClick={onUndo} className="btn-secondary mt-2 text-xs disabled:opacity-50">
            {status === 'undoing' ? 'Undoing…' : `Undo this change (open for ${proposal.undoDays} days)`}
          </button>
        </div>
      ) : status === 'undone' ? (
        <p role="status" className="mt-3 text-xs text-[var(--text-primary)]">{undoResultLine(result)}</p>
      ) : status === 'rejected' ? (
        <p role="status" className="mt-3 text-xs text-[var(--text-muted)]">Rejected. Nothing was changed.</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" disabled={busy || decided} onClick={onApprove} className="btn-primary text-xs disabled:opacity-50">
            {status === 'applying' ? 'Applying…' : `Approve (${proposal.willChange} ${proposal.willChange === 1 ? 'record' : 'records'})`}
          </button>
          <button type="button" disabled={busy || decided} onClick={onReject} className="btn-secondary text-xs disabled:opacity-50">Reject</button>
        </div>
      )}
      {error ? <p role="alert" className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
