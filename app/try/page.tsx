import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { TryoutClient } from './TryoutClient';

export const metadata: Metadata = {
  title: 'Try AnalyzeIt: 5 free runs',
  description: 'Ask AnalyzeIt a question and get a real answer, no account needed. Five free runs, then create a free account to keep going.',
  alternates: { canonical: '/try' },
};

export default function TryPage() {
  return (
    <LegalLayout
      title="Start analyzing now."
      eyebrow={false}
      showHeroUpdated={false}
      quietOperator
      subtitle="Ask a question and get a real answer. No account for your first five runs."
    >
      <TryoutClient />

      <section className="space-y-3 text-sm leading-relaxed text-[#4A4238]/85 dark:text-[#C5B9AE]">
        <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">About the free runs</h2>
        <p>
          Each run is a real answer from an AI model, so the try-out is limited: five runs, then a pause of about a day before you can use it again from the same
          network or browser. Nothing you type here is saved to an account. Questions about your own files and data, links, and longer questions need a free account.{' '}
          <Link href="/login?tab=register" className="text-[#C45A42] underline underline-offset-2">Create one</Link> or see{' '}
          <Link href="/products" className="text-[#C45A42] underline underline-offset-2">what each plan includes</Link>.
        </p>
        <p>
          Prefer to watch first?{' '}
          <Link href="/case" className="text-[#C45A42] underline underline-offset-2">See a real run on public data</Link>, no signup.
        </p>
      </section>
    </LegalLayout>
  );
}
