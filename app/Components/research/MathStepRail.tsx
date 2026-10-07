'use client';

import { mathStepStatusLabel, type MathStep } from '../../lib/mathFindings.mjs';

/**
 * In-run math step rail: ordinal + plain method name + Running/Done/Failed.
 * Same column as findings — not a separate IDE. Click scrolls/highlights the finding card.
 */
export function MathStepRail({
  steps,
  onSelect,
  activeId,
}: {
  steps: MathStep[];
  onSelect?: (findingId: string) => void;
  activeId?: string | null;
}) {
  if (!steps.length) return null;
  return (
    <nav aria-label="Math steps" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="mb-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--finding-soft)' }}>
        Math steps
      </p>
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const status = mathStepStatusLabel(s.state);
          const clickable = s.state === 'done' || s.state === 'failed' || s.state === 'unwired';
          const active = activeId === s.findingId;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!clickable || !onSelect}
                onClick={() => onSelect?.(s.findingId)}
                className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                  active ? 'bg-[color-mix(in_srgb,var(--finding-accent)_14%,var(--surface))]' : 'hover:bg-[var(--surface)]'
                } disabled:cursor-default disabled:opacity-80`}
              >
                <span className="tabular-nums font-medium text-[var(--text-primary)]" style={{ color: s.state === 'running' ? 'var(--finding-accent)' : undefined }}>
                  {i + 1}.
                </span>
                <span className={`flex-1 ${s.state === 'running' ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>{s.label}</span>
                <span
                  className="shrink-0 font-mono text-[10px] uppercase tracking-wide"
                  style={{
                    color: s.state === 'done' ? 'var(--success, #4A7C59)' : s.state === 'failed' || s.state === 'unwired' ? 'var(--warning, #B45309)' : 'var(--finding-soft)',
                  }}
                >
                  {status}
                </span>
                {s.detail ? (
                  <span className="sr-only">
                    {s.detail}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
