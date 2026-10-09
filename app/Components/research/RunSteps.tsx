'use client';

import type { RunStep } from '../../lib/findings.mjs';

/** The live checklist while discovery works: what it is doing now and what it has done, with real counts. */
export function RunSteps({ steps }: { steps: RunStep[] }) {
  if (!steps.length) return null;
  return (
    <ol className="mt-2 space-y-1 text-xs" aria-label="Progress" aria-live="polite">
      {steps.map((s) => (
        <li key={s.id} className="flex items-baseline gap-2" style={{ color: s.state === 'pending' ? 'var(--finding-soft)' : 'var(--text-primary)', opacity: s.state === 'pending' ? 0.7 : 1 }}>
          <span aria-hidden="true" className="inline-block w-3 text-center" style={{ color: s.state === 'done' ? 'var(--finding-accent)' : undefined }}>
            {s.state === 'done' ? '✓' : s.state === 'running' ? '›' : '·'}
          </span>
          <span className={s.state === 'running' ? 'font-medium' : ''}>{s.label}</span>
          <span className="sr-only">{s.state === 'done' ? '(done)' : s.state === 'running' ? '(in progress)' : '(waiting)'}</span>
          {s.detail ? <span style={{ color: 'var(--finding-soft)' }}>{s.detail}</span> : null}
        </li>
      ))}
    </ol>
  );
}
