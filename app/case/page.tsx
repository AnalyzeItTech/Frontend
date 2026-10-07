import type { Metadata } from 'next';
import Link from 'next/link';
import { CaseRunner } from '../Components/case/CaseRunner';
import { CaseResult } from '../Components/case/CaseResult';
import { parseFindings } from '../lib/findings.mjs';
import mathFixture from '../lib/fixtures/findings.math.json';

export const metadata: Metadata = {
  title: 'Watch a real case run: public data, live, no signup — AnalyzeIt',
  description: 'Pick a public-data question and watch AnalyzeIt find the data, download it, read it and show what stands out, with sources and the working. No account needed.',
  alternates: { canonical: '/case' },
};

/**
 * Temporary Design QA: /case?fixture=math renders findings.math.json (Regression / Forecast / What-if).
 * Query-param only — not linked from nav. Remove when live Model assembler ships.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ fixture?: string }> }) {
  const sp = await searchParams;
  if (sp.fixture === 'math') {
    const findings = parseFindings(mathFixture);
    if (!findings) {
      return (
        <main className="mx-auto max-w-xl px-6 py-16 text-[var(--text-primary)]">
          <p>Math fixture failed to parse.</p>
        </main>
      );
    }
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-[var(--text-primary)]">
        <nav className="mb-6 text-sm">
          <Link href="/case" className="text-[var(--text-muted)] hover:text-[var(--finding-accent)]">
            ← Cases
          </Link>
        </nav>
        <p
          className="mb-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs"
          style={{ color: 'var(--finding-soft)' }}
          role="note"
        >
          Temporary Design QA fixture (<code className="font-mono">?fixture=math</code>) — not a live run. Regression scatter+fit, Forecast history+95% band, What-if unwired empty.
        </p>
        <CaseResult
          title="Phase 1 math sample"
          question="Show Regression, Forecast, and What-if finding cards (fixture)"
          text="Sample math run for Design QA. Regression uses linear_trend; Forecast is forecast_tool (OLS + 95% residual bands). What-if is not wired yet — no scenario numbers were made up."
          findings={findings}
          steps={[]}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-[var(--text-primary)]">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--finding-accent)]">
          ← AnalyzeIt
        </Link>
      </nav>
      <CaseRunner />
    </main>
  );
}
