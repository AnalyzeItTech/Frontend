import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { loadMarketingQuote } from '../lib/marketingQuote.mjs';
import { ProductsPlans } from './ProductsPlans';

export const metadata: Metadata = {
  title: 'Products & pricing — AnalyzeIt',
  description: 'AnalyzeIt plans: Free, Premium and VIP, billed monthly in INR via Razorpay. USD amounts are for reference; the exact INR price is confirmed at checkout.',
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  // Same India quote the homepage renders. Seed it here so the HTML is whole rupees,
  // not the USD-only fallback shown before the browser fetch returns.
  const quote = await loadMarketingQuote();
  return (
    <LegalLayout
      title="Fair pricing for quiet research."
      updated="September 25, 2026"
      eyebrow={false}
      showHeroUpdated={false}
      quietOperator
      subtitle="Paid plans are billed monthly in INR via Razorpay. The USD figure is a reference; the exact INR price is confirmed at checkout."
    >
      <ProductsPlans initialQuote={quote} />

      <p>
        Hit a Free limit mid-research? Upgrade from Billing after sign-in — your work stays;
        entitlements change.
      </p>

      <p className="text-xs text-[#4A4238]/55 dark:text-[#91867E]">
        Policies:{' '}
        <a href="/refund" className="text-[#E3836C] hover:underline">
          Refunds and cancellations
        </a>
        {' · '}
        <a href="/shipping" className="text-[#E3836C] hover:underline">
          digital access (no physical shipping)
        </a>
        {' · '}
        <Link href="/#pricing" className="text-[#E3836C] hover:underline">
          homepage pricing
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
