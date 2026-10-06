import type { Metadata } from 'next';
import Link from 'next/link';
import { CaseRunner } from '../Components/case/CaseRunner';

export const metadata: Metadata = {
  title: 'Watch a real case run: public data, live, no signup — AnalyzeIt',
  description: 'Pick a public-data question and watch AnalyzeIt find the data, download it, read it and show what stands out, with sources and the working. No account needed.',
  alternates: { canonical: '/case' },
};

export default function Page() {
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
