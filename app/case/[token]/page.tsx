import type { Metadata } from 'next';
import Link from 'next/link';
import { CaseResult } from '../../Components/case/CaseResult';
import { stepsFromActivity } from '../../lib/caseRun.mjs';
import { parseFindings } from '../../lib/findings.mjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Saved {
  title: string;
  question: string;
  text: string;
  findings: unknown;
  activity?: unknown;
  created_at?: string | null;
}

async function load(token: string): Promise<Saved | null> {
  try {
    const res = await fetch(`${API}/v1/case-runs/${encodeURIComponent(token)}`, { next: { revalidate: 60 } });
    return res.ok ? ((await res.json()) as Saved) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const d = await load(token);
  const title = d ? `${d.title}: a source-backed answer — AnalyzeIt` : 'AnalyzeIt case run';
  return {
    title,
    description: d ? `${d.question} Answer with the data source and the working shown.` : 'A saved AnalyzeIt case run.',
    robots: { index: false, follow: false }, // a saved run is for whoever has the link
    openGraph: { title, description: d?.question || 'A saved AnalyzeIt case run.' },
  };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await load(token);
  const findings = d ? parseFindings(d.findings) : null;
  if (!d || !findings) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-[var(--text-primary)]">
        <p>This result is no longer available. Saved runs are kept for 30 days.</p>
        <Link href="/case" className="mt-4 inline-block underline underline-offset-2">
          Run a case again
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[var(--text-primary)]">
      <nav className="mb-8 text-sm">
        <Link href="/case" className="text-[var(--text-muted)] hover:text-[var(--finding-accent)]">
          ← More cases
        </Link>
      </nav>
      <CaseResult title={d.title} question={d.question} text={d.text} findings={findings} steps={stepsFromActivity(d.activity)} sharePath={`/case/${token}`} createdAt={d.created_at} />
    </main>
  );
}
