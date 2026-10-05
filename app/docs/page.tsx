import type { Metadata } from 'next';
import Link from 'next/link';
import { DOC_LINKS, DocPage } from '../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'Docs — AnalyzeIt',
  description: 'How AnalyzeIt answers questions, what each plan includes, what memory means, which connectors exist, and what changed recently.',
  alternates: { canonical: '/docs' },
};

const BLURBS: Record<string, string> = {
  '/docs/how-answers-work': 'When a live tool answers, when a model does, and what happens when a tool fails.',
  '/docs/plans': 'Exactly what Free, Premium and VIP include, in numbers.',
  '/docs/memory': 'What “memory” stores, how it is searched, how to see and delete it.',
  '/docs/connectors': 'What you can connect today and what is still rolling out.',
  '/changelog': 'What shipped, dated, including what is not finished.',
};

export default function DocsIndex() {
  return (
    <DocPage title="Docs" subtitle="Plain explanations of how AnalyzeIt works, written to be checked against the product.">
      <ul className="!list-none !pl-0 space-y-4">
        {DOC_LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="font-serif text-xl">{l.label}</Link>
            <p className="text-sm text-[#4A4238]/80 dark:text-[#C5B9AE]">{BLURBS[l.href]}</p>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
