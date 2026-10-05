import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';
import { DemoClient } from '../../demo/DemoClient';

export const metadata: Metadata = {
  title: "AAPL stock price with provenance",
  description: "Look up the Apple (AAPL) share price from a live market data tool, with the source shown. Indicative quotes are labelled as such.",
  alternates: { canonical: '/cases/aapl-stock-price' },
};

export default function Page() {
  return (
    <DocPage title="AAPL stock price, with provenance." subtitle="A share price is a number people act on, so where it came from matters. Here a market-data tool answers, and quotes that are not live are labelled as indicative.">
      <h2>Ask it yourself</h2>
      <p>This runs live when the page opens, so the figure below is today’s, not a screenshot.</p>
      <DemoClient preset="What is the stock price of AAPL?" />

      <h2>How it works</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>The question is recognised as a stock quote for the ticker AAPL.</li>
        <li>AnalyzeIt calls the market-data tool for the latest quote.</li>
        <li>The result is shown with its source. If the quote is delayed or indicative, the answer says so.</li>
      </ol>
      <p>This is information, not investment advice.</p>
      <p>
        More on the difference between tool answers and model answers: <Link href="/docs/how-answers-work">How answers work</Link>.
      </p>
    </DocPage>
  );
}
