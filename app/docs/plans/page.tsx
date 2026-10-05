import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '../../Components/docs/DocPage';
import { PLAN_FEATURES, PLAN_NAMES, USD_REFERENCE } from '../../lib/planCatalog.mjs';

export const metadata: Metadata = {
  title: 'What each AnalyzeIt plan includes — AnalyzeIt docs',
  description: 'The exact limits of the Free, Premium and VIP plans: tokens, AI runs, projects, widgets, memory and artifact retention.',
  alternates: { canonical: '/docs/plans' },
};

const IDS = ['free', 'premium', 'premium_plus'] as const;

export default function Page() {
  return (
    <DocPage title="What each plan includes" subtitle="The same numbers the pricing page and Billing use, in one place.">
      {IDS.map((id) => (
        <section key={id}>
          <h2>
            {PLAN_NAMES[id]} {USD_REFERENCE[id] ? <span className="text-base font-sans text-[#4A4238]/70">· ${USD_REFERENCE[id]} USD reference</span> : <span className="text-base font-sans text-[#4A4238]/70">· no charge</span>}
          </h2>
          <ul>
            {PLAN_FEATURES[id].map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2>A few things worth knowing</h2>
      <ul>
        <li>
          <strong>Tool answers are free of model tokens.</strong> A weather, currency, stock or math answer does not use your AI runs or
          your token allowance.
        </li>
        <li>
          <strong>Prices.</strong> Paid plans are billed monthly in INR through Razorpay. The USD figure is a reference; the exact INR
          price is shown at checkout. See <Link href="/products">Products</Link> for the current price.
        </li>
        <li>
          <strong>Memory</strong> is the total your account can store. What that means is explained in <Link href="/docs/memory">Memory</Link>.
        </li>
        <li>
          <strong>Refunds and cancellation:</strong> see <Link href="/refund">the refund policy</Link>.
        </li>
      </ul>
    </DocPage>
  );
}
