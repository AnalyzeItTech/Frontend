'use client';

import { useId } from 'react';
import { breakdownLine, checkedLine, partialLine, type Finding, type ParsedFindings } from '../../lib/findings.mjs';
import { FindingChart } from './FindingChart';

/**
 * What discovery found, as cards: a plain title, the picture, one sentence on what it means, and, a click away, all of the
 * reasoning (what it is based on, the exact figures, where the data came from, the query that was run). The default view is
 * simple; nothing is hidden, only folded.
 */

const TONE: Record<string, string> = { ok: 'var(--success)', info: 'var(--info)', warn: 'var(--warning)' };

function ConfidencePill({ f }: { f: Finding }) {
  const tone = TONE[f.confidenceTone] ?? 'var(--info)';
  return (
    <span
      title={f.confidenceNote || undefined}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-[var(--text-primary)]"
      style={{ borderColor: `color-mix(in srgb, ${tone} 55%, var(--border))`, background: `color-mix(in srgb, ${tone} 12%, var(--surface))` }}
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: tone }} />
      {f.confidenceLabel}
    </span>
  );
}

function Working({ f }: { f: Finding }) {
  const hasAny = f.why.length || f.reasoning.length || f.figures.length || f.sql || f.confidenceNote;
  if (!hasAny) return null;
  return (
    <details className="group rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none font-medium text-[var(--text-primary)]">Show the working</summary>
      <div className="mt-3 space-y-4 text-[var(--text-primary)]">
        {f.why.length ? (
          <section>
            <h5 className="mb-1 font-semibold">What this is based on</h5>
            <ul className="list-disc space-y-1 pl-4">
              {f.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {f.confidenceNote ? (
          <section>
            <h5 className="mb-1 font-semibold">How sure we are: {f.confidenceLabel}</h5>
            <p style={{ color: 'var(--finding-soft)' }}>{f.confidenceNote}</p>
          </section>
        ) : null}
        {f.reasoning.length ? (
          <section>
            <h5 className="mb-1 font-semibold">The exact reasoning</h5>
            <p className="mb-1">{f.headline}</p>
            <ul className="list-disc space-y-1 pl-4">
              {f.reasoning.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {f.figures.length ? (
          <section>
            <h5 className="mb-1 font-semibold">The numbers</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Figures behind this finding</caption>
                <tbody>
                  {f.figures.map((r, i) => (
                    <tr key={`${r.label}-${i}`} className="border-t border-[var(--border)]">
                      <th scope="row" className="py-1 pr-3 text-left font-normal" style={{ color: 'var(--finding-soft)' }}>
                        {r.label}
                      </th>
                      <td className="py-1 pr-3 tabular-nums">
                        <b className="font-semibold">{r.value}</b>
                        {r.note ? <span style={{ color: 'var(--finding-soft)' }}> · {r.note}</span> : null}
                      </td>
                      <td className="py-1 text-right tabular-nums" style={{ color: 'var(--finding-soft)' }}>
                        {r.n !== null ? `${r.n.toLocaleString('en-US')} records` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        <section>
          <h5 className="mb-1 font-semibold">Where the data came from</h5>
          <p style={{ color: 'var(--finding-soft)' }}>
            {f.source.origin === 'online' ? (
              <>
                From the internet{f.source.url ? ': ' : '. '}
                {f.source.url ? (
                  <a href={f.source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                    {f.source.url}
                  </a>
                ) : null}{' '}
                We have not verified it.
              </>
            ) : (
              <>Your table “{f.source.table}”. Nothing was changed; the analysis only read it.</>
            )}
          </p>
        </section>
        {f.sql ? (
          <section>
            <h5 className="mb-1 font-semibold">The query that was run (read-only)</h5>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-[var(--surface-3)] p-2 text-[11px] leading-snug">{f.sql}</pre>
          </section>
        ) : null}
      </div>
    </details>
  );
}

function FindingCard({ f, onAsk, disabled }: { f: Finding; onAsk?: (q: string) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <article className="app-card space-y-3 p-4" aria-labelledby={`${id}-t`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--finding-soft)' }}>
          {f.kindLabel}
        </span>
        <ConfidencePill f={f} />
      </div>
      <h4 id={`${id}-t`} className="text-[15px] font-medium leading-snug text-[var(--text-primary)]">
        {f.title}
      </h4>
      <FindingChart finding={f} />
      {f.soWhat ? <p className="text-sm text-[var(--text-primary)]">{f.soWhat}</p> : null}
      {f.followups.length && onAsk ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ask about this finding">
          {f.followups.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(q)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-left text-xs text-[var(--text-primary)] transition hover:border-[var(--finding-accent)] disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
      <Working f={f} />
    </article>
  );
}

export function FindingCards({ data, onAsk, disabled }: { data: ParsedFindings; onAsk?: (q: string) => void; disabled?: boolean }) {
  const partial = partialLine(data);
  const line = checkedLine(data);
  const breakdown = breakdownLine(data);
  return (
    <section aria-label="What stands out in your data" className="mt-3 space-y-3">
      <header>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">What stands out</h3>
        {line ? (
          <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
            {line}
          </p>
        ) : null}
      </header>
      {partial ? (
        <p role="note" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {partial}
        </p>
      ) : null}
      {data.findings.map((f) => (
        <FindingCard key={f.id} f={f} onAsk={onAsk} disabled={disabled} />
      ))}
      {breakdown ? (
        <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
          Also checked: {breakdown}. Anything not shown above did not stand out from ordinary ups and downs.
        </p>
      ) : null}
      {data.notes.map((n) => (
        <p key={n} className="text-xs" style={{ color: 'var(--finding-soft)' }}>
          {n}
        </p>
      ))}
    </section>
  );
}
