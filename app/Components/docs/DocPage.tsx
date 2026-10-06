import Link from 'next/link';
import { LegalLayout } from '../legal/LegalLayout';

export const DOC_LINKS = [
  { href: '/docs/how-answers-work', label: 'How answers work' },
  { href: '/docs/discovery', label: 'Discovery, online data and bulk edits' },
  { href: '/docs/plans', label: 'What each plan includes' },
  { href: '/docs/memory', label: 'Memory' },
  { href: '/docs/connectors', label: 'Connectors' },
  { href: '/guides', label: 'Guides' },
  { href: '/changelog', label: 'Changelog' },
] as const;

/** One layout for every docs page: the same nav, readable width, and a line back to the live demo. */
export function DocPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <LegalLayout title={title} eyebrow={false} showHeroUpdated={false} quietOperator subtitle={subtitle}>
      <nav aria-label="Docs" className="mb-8 flex flex-wrap gap-x-5 gap-y-2 border-b border-[#4A4238]/10 pb-4 text-sm dark:border-[#3A3430]">
        <Link href="/docs" className="font-medium text-[#C45A42] hover:underline">Docs</Link>
        {DOC_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-[#4A4238]/80 hover:text-[#C45A42] dark:text-[#C5B9AE]">{l.label}</Link>
        ))}
      </nav>
      <div className="max-w-2xl space-y-5 text-[15px] leading-relaxed text-[#3F3830] dark:text-[#E6DCD2] [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[#322C28] dark:[&_h2]:text-[#F4EDE5] [&_a]:text-[#C45A42] [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-10 text-sm text-[#4A4238]/70 dark:text-[#C5B9AE]">
        Want to see it rather than read about it? <Link href="/demo" className="text-[#C45A42] underline underline-offset-2">Try the live demo</Link>, no account needed.
      </p>
    </LegalLayout>
  );
}
