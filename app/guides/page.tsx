import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { GUIDES, readMinutes } from '../lib/guides.mjs';

export const metadata: Metadata = {
  title: 'Guides to working with data — AnalyzeIt',
  description: 'Plain guides: find what changed in your numbers, tell real change from noise, find and check public data, and clean a messy CSV.',
  alternates: { canonical: '/guides' },
};

export default function Page() {
  return (
    <LegalLayout title="Guides to working with data." eyebrow={false} showHeroUpdated={false} quietOperator subtitle="Short, practical guides on getting answers from numbers without fooling yourself.">
      <ul className="max-w-2xl space-y-6">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="font-serif text-2xl text-[#322C28] hover:text-[#C45A42] dark:text-[#F4EDE5]">
              {g.title}
            </Link>
            <p className="mt-1 text-[15px] text-[#4A4238]/85 dark:text-[#C5B9AE]">{g.description}</p>
            <p className="mt-1 text-xs text-[#4A4238]/60 dark:text-[#91867E]">{readMinutes(g)} min read</p>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-[#4A4238]/70 dark:text-[#C5B9AE]">
        Prefer to see it work? <Link href="/demo" className="text-[#C45A42] underline underline-offset-2">Try the live demo</Link> or browse the{' '}
        <Link href="/cases" className="text-[#C45A42] underline underline-offset-2">worked examples</Link>.
      </p>
    </LegalLayout>
  );
}
