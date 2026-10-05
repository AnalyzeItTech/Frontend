import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';
import { DemoClient } from '../../demo/DemoClient';

export const metadata: Metadata = {
  title: "USD to INR rate, with the source shown",
  description: "Convert US dollars to Indian rupees using a live exchange-rate feed, with the source shown and no AI model involved.",
  alternates: { canonical: '/cases/usd-to-inr' },
};

export default function Page() {
  return (
    <DocPage title="USD to INR, with the source shown." subtitle="Exchange-rate questions are exactly where a number must not be made up. Here the rate comes from a currency feed, and AnalyzeIt shows you that feed.">
      <h2>Ask it yourself</h2>
      <p>This runs live when the page opens, so the figure below is today’s, not a screenshot.</p>
      <DemoClient preset="Convert 100 USD to INR" />

      <h2>How it works</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>The question is recognised as a currency conversion.</li>
        <li>AnalyzeIt calls the exchange-rate tool for the live USD to INR rate and multiplies.</li>
        <li>You see the result, the source, and the label From tools · 0 tokens, because no model wrote the number.</li>
      </ol>
      <p>Rates move through the day and differ from what your bank or card network charges. Treat this as a reference rate.</p>
      <p>
        More on the difference between tool answers and model answers: <Link href="/docs/how-answers-work">How answers work</Link>.
      </p>
    </DocPage>
  );
}
