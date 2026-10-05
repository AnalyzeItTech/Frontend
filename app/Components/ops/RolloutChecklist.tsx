'use client';

import { useState } from 'react';
import { allowAccountBody, removeAccountBody, statusLook, validAccountId, type FlagRule } from '../../lib/rolloutPanel.mjs';

export interface ReadinessCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'todo' | string;
  detail: string;
  fix?: string;
}

export interface Readiness {
  checks: ReadinessCheck[];
  next_step: string;
  ready_to_switch_on: boolean;
  counts?: Record<string, number>;
  flags?: Record<string, { on: boolean; summary: string }>;
}

/** The order to switch stored memory on, what is still missing, and a way to try one account first. */
export function RolloutChecklist({
  readiness,
  rules,
  onFlag,
}: {
  readiness: Readiness;
  rules: Record<string, FlagRule>;
  onFlag: (flag: string, body: Record<string, unknown>) => void;
}) {
  const [account, setAccount] = useState('');
  const ok = validAccountId(account);
  const counts = readiness.counts || {};
  return (
    <section className="space-y-3 rounded-xl border border-[var(--border)] p-3" aria-label="Memory rollout">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Memory rollout</h2>
        <span className="text-xs text-[var(--text-muted)]">
          {counts.sources ?? 0} sources · {counts.items ?? 0} items · {counts.vectors ?? 0} vectors · {counts.pending_items ?? 0} waiting
        </span>
      </div>
      <p className={`rounded-lg px-3 py-2 ${readiness.ready_to_switch_on ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <span className="font-medium">Next: </span>
        {readiness.next_step}
      </p>
      <ul className="space-y-1.5">
        {readiness.checks.map((c) => {
          const look = statusLook(c.status);
          return (
            <li key={c.id} className="flex gap-2">
              <span className={`w-4 shrink-0 font-mono ${look.cls}`} aria-label={look.label}>{look.mark}</span>
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="text-[var(--text-secondary)]"> · {c.detail}</span>
                {c.fix && c.status !== 'ok' ? <span className="block text-xs text-[var(--text-muted)]">Fix: {c.fix}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <span className="text-xs">Try on one account first (user id):</span>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="account id"
          aria-label="Account id to try the memory switches on"
          className="w-64 rounded border border-[var(--border)] px-2 py-1 font-mono text-xs"
        />
        {(['dual_write', 'read_new'] as const).map((flag) => (
          <span key={flag} className="inline-flex gap-1">
            <button type="button" disabled={!ok} className="rounded border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-40" onClick={() => onFlag(flag, allowAccountBody(rules[flag], account))}>
              Allow on {flag}
            </button>
            <button type="button" disabled={!ok} className="rounded border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-40" onClick={() => onFlag(flag, removeAccountBody(rules[flag], account))}>
              Remove
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
