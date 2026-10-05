import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { DemoClient } from './DemoClient';

export const metadata: Metadata = {
  title: 'Try AnalyzeIt without signing up',
  description: 'Ask a weather, currency, stock or math question and get an answer straight from a live tool, with sources shown and no AI model tokens used. No account needed.',
  alternates: { canonical: '/demo' },
};

export default function DemoPage() {
  return (
    <LegalLayout
      title="Try it without signing up."
      eyebrow={false}
      showHeroUpdated={false}
      quietOperator
      subtitle="Ask a weather, currency, stock or math question. The answer comes from a live tool, not a model, and the source is shown."
    >
      <DemoClient />

      <section className="space-y-3 text-sm leading-relaxed text-[#4A4238]/85 dark:text-[#C5B9AE]">
        <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">What you are looking at</h2>
        <p>
          When a question can be answered by a tool (a weather service, an exchange-rate feed, a stock quote, a calculator),
          AnalyzeIt calls the tool and shows you its answer and its source. That answer is marked <strong>From tools · 0 tokens</strong>
          because no AI model wrote it, so it cannot make a number up.
        </p>
        <p>
          Questions about your own files, records and notes, or anything that needs reasoning, need a free account.{' '}
          <Link href="/login?tab=register" className="text-[#C45A42] underline underline-offset-2">Create one</Link> or see{' '}
          <Link href="/products" className="text-[#C45A42] underline underline-offset-2">what each plan includes</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
