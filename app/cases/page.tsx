import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../Components/docs/DocPage';

export const metadata: Metadata = {
  title: 'Worked examples — AnalyzeIt',
  description: 'Real questions answered live, each showing its source and whether a tool or a model answered.',
  alternates: { canonical: '/cases' },
};

const CASES = [
  { href: '/cases/usd-to-inr', title: 'USD to INR, with the source shown', blurb: 'A currency conversion from a live exchange-rate feed.' },
  { href: '/cases/weather-mumbai', title: 'Mumbai weather, without inventing it', blurb: 'Current conditions from a weather service, or an honest “could not find it”.' },
  { href: '/cases/aapl-stock-price', title: 'AAPL stock price, with provenance', blurb: 'A share quote from a market-data tool, labelled if it is only indicative.' },
];

export default function Page() {
  return (
    <DocPage title="Worked examples" subtitle="Real questions, answered live. Each shows its source and whether a tool or a model answered.">
      <ul className="!list-none !pl-0 space-y-4">
        {CASES.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="font-serif text-xl">{c.title}</Link>
            <p className="text-sm text-[#4A4238]/80 dark:text-[#C5B9AE]">{c.blurb}</p>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
