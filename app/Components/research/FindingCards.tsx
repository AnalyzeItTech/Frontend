'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  breakdownLine,
  checkedLine,
  onlineNotice,
  partialLine,
  provenanceLine,
  sourceLines,
  type Finding,
  type FindingsScope,
  type ParsedFindings,
} from '../../lib/findings.mjs';
import {
  copyAllMathSummaries,
  copyMathFindingSummary,
  isMathFinding,
  mathCardTitle,
  mathProvenanceLine,
} from '../../lib/mathFindings.mjs';
import { FindingChart } from './FindingChart';
import { MathStepRail } from './MathStepRail';

/**
 * What discovery found, as cards — plus Phase 1 math finding cards (Regression / Forecast / What-if)
 * with KPIs, assumptions, chart, caveat, and structured fields for later briefing.
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

function Working({ f, source }: { f: Finding; source?: FindingsScope['sources'][number] }) {
  const hasAny = f.why.length || f.reasoning.length || f.figures.length || f.sql || f.confidenceNote || source;
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
          {f.source.origin === 'online' ? (
            <div style={{ color: 'var(--finding-soft)' }}>
              <ul className="space-y-0.5">
                {sourceLines(source).map((line, i) => (
                  <li key={line} className={i === 0 ? 'font-medium text-[var(--text-primary)]' : ''}>
                    {line}
                  </li>
                ))}
              </ul>
              {f.source.url ? (
                <p className="mt-1">
                  <a href={f.source.url} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">
                    {f.source.url}
                  </a>
                </p>
              ) : null}
              <p className="mt-1">From the internet; we have not verified it.</p>
            </div>
          ) : (
            <p style={{ color: 'var(--finding-soft)' }}>Your table “{f.source.table}”. Nothing was changed; the analysis only read it.</p>
          )}
        </section>
        {source && source.notes.length ? (
          <section>
            <h5 className="mb-1 font-semibold">How the data was read</h5>
            <ul className="list-disc space-y-1 pl-4">
              {source.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}
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

function Assumptions({ lines, preferOpen }: { lines: string[]; preferOpen: boolean }) {
  const [open, setOpen] = useState(preferOpen);
  useEffect(() => {
    setOpen(preferOpen);
  }, [preferOpen]);
  if (!lines.length) return null;
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
    >
      <summary className="cursor-pointer select-none font-medium text-[var(--text-primary)]">Assumptions</summary>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--text-primary)]">
        {lines.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </details>
  );
}

function KpiChips({ kpis }: { kpis: Array<{ label: string; value: string; note: string }> }) {
  if (!kpis.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Key numbers">
      {kpis.map((k) => (
        <li key={k.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <p className="font-serif text-lg tabular-nums leading-tight text-[var(--text-primary)] sm:text-xl">{k.value}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--finding-soft)' }}>
            {k.label}
            {k.note ? ` · ${k.note}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

function MathEmpty({ methodLabel, canRetry, onRetry }: { methodLabel: string; canRetry?: boolean; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,#F5EDE4_80%,var(--surface))] px-4 py-6 text-center">
      <p className="text-sm text-[var(--text-primary)]">Couldn’t complete {methodLabel}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--finding-soft)' }}>
        {methodLabel === 'What-if' ? 'Stress / scenario step isn’t wired in Model compute yet.' : 'The calculation did not finish.'}
      </p>
      {canRetry && onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3 text-xs">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function useDesktopAssumptionsOpen(lineCount: number) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)') : null;
    const apply = () => setOpen(Boolean(mq?.matches) && lineCount > 0 && lineCount <= 4);
    apply();
    mq?.addEventListener('change', apply);
    return () => mq?.removeEventListener('change', apply);
  }, [lineCount]);
  return open;
}

function MathFindingCard({
  f,
  source,
  onAsk,
  disabled,
  highlighted,
  signedIn,
  onRetry,
}: {
  f: Finding;
  source?: FindingsScope['sources'][number];
  onAsk?: (q: string) => void;
  disabled?: boolean;
  highlighted?: boolean;
  signedIn?: boolean;
  onRetry?: () => void;
}) {
  const id = useId();
  const math = f.math!;
  const title = mathCardTitle(math, f.title);
  const fromTools = mathProvenanceLine(math);
  const from = provenanceLine(f);
  const assumeOpen = useDesktopAssumptionsOpen(math.assumptions.length);
  const [copied, setCopied] = useState(false);
  const failed = math.mathStatus === 'failed' || math.mathStatus === 'unwired';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyMathFindingSummary(f));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <article
      id={`finding-${f.id}`}
      data-math-method={math.method}
      data-chart-ref={math.chartRef || undefined}
      className={`app-card space-y-3 p-4 transition ring-offset-2 ring-offset-[var(--surface)] ${highlighted ? 'ring-2 ring-[var(--finding-accent)]' : ''}`}
      aria-labelledby={`${id}-t`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--finding-soft)' }}>
          {math.methodLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {fromTools ? (
            <span className="inline-flex items-center rounded-full bg-[#8FA98F]/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#4A7C59] dark:text-[#9EBB9A]">
              {fromTools}
            </span>
          ) : null}
          {!failed ? <ConfidencePill f={f} /> : null}
        </div>
      </div>
      <h4 id={`${id}-t`} className="text-[15px] font-medium leading-snug text-[var(--text-primary)]">
        {title}
      </h4>

      {failed ? (
        <MathEmpty methodLabel={math.methodLabel} canRetry={Boolean(signedIn && math.mathStatus === 'failed')} onRetry={onRetry} />
      ) : (
        <>
          <KpiChips kpis={math.kpis} />
          <Assumptions lines={math.assumptions} preferOpen={assumeOpen} />
          {f.visual ? (
            <div>
              <FindingChart finding={f} />
              {math.chartCaption ? (
                <p className="mt-1 text-xs" style={{ color: 'var(--finding-soft)' }}>
                  {math.chartCaption}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {math.caveat ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--finding-soft)' }}>
          {math.caveat}
        </p>
      ) : null}

      {from ? (
        <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
          Source: {from}
        </p>
      ) : f.source.table ? (
        <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
          Source: {f.source.table}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copy()} className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
          {copied ? 'Copied summary' : 'Copy summary'}
        </button>
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
      </div>

      {!failed ? <Working f={f} source={source} /> : null}
    </article>
  );
}

function FindingCard({ f, source, onAsk, disabled }: { f: Finding; source?: FindingsScope['sources'][number]; onAsk?: (q: string) => void; disabled?: boolean }) {
  const id = useId();
  const from = provenanceLine(f);
  return (
    <article id={`finding-${f.id}`} className="app-card space-y-3 p-4" aria-labelledby={`${id}-t`}>
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
      {from ? (
        <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
          Source: {from}
        </p>
      ) : null}
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
      <Working f={f} source={source} />
    </article>
  );
}

export function FindingCards({
  data,
  onAsk,
  disabled,
  signedIn,
  onRetryMath,
}: {
  data: ParsedFindings;
  onAsk?: (q: string) => void;
  disabled?: boolean;
  /** Guest views leave this false — no retry chrome. */
  signedIn?: boolean;
  onRetryMath?: () => void;
}) {
  const partial = partialLine(data);
  const line = checkedLine(data);
  const breakdown = breakdownLine(data);
  const online = onlineNotice(data);
  const mathSteps = data.mathSteps || [];
  const hasMath = mathSteps.length > 0 || data.findings.some(isMathFinding);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const selectStep = useCallback((findingId: string) => {
    setActiveId(findingId);
    const el = typeof document !== 'undefined' ? document.getElementById(`finding-${findingId}`) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => setActiveId((cur) => (cur === findingId ? null : cur)), 2200);
  }, []);

  const copyAll = async () => {
    const text = copyAllMathSummaries(data);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <section aria-label={hasMath ? 'Math findings' : 'What stands out in your data'} className="mt-3 space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{hasMath ? 'Analysis steps' : 'What stands out'}</h3>
          {line ? (
            <p className="text-xs" style={{ color: 'var(--finding-soft)' }}>
              {line}
            </p>
          ) : null}
        </div>
        {hasMath ? (
          <button type="button" onClick={() => void copyAll()} className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline">
            {copiedAll ? 'Copied summaries' : 'Copy summary'}
          </button>
        ) : null}
      </header>

      {hasMath ? <MathStepRail steps={mathSteps} onSelect={selectStep} activeId={activeId} /> : null}

      {online ? (
        <p role="note" className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-primary)]">
          {online}
        </p>
      ) : null}
      {partial ? (
        <p role="note" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {partial}
        </p>
      ) : null}
      {data.findings.map((f) =>
        isMathFinding(f) ? (
          <MathFindingCard
            key={f.id}
            f={f}
            source={data.scope.sources.find((s) => s.table === f.source.table)}
            onAsk={onAsk}
            disabled={disabled}
            highlighted={activeId === f.id}
            signedIn={signedIn}
            onRetry={onRetryMath}
          />
        ) : (
          <FindingCard key={f.id} f={f} source={data.scope.sources.find((s) => s.table === f.source.table)} onAsk={onAsk} disabled={disabled} />
        ),
      )}
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
