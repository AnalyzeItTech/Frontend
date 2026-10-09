import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { normalizeCountry, COUNTRY_COOKIE } from '../lib/countryProfile.mjs';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { loadMarketingQuote } from '../lib/marketingQuote.mjs';
import { ProductsPlans } from './ProductsPlans';

export const metadata: Metadata = {
  title: 'Products & pricing — AnalyzeIt',
  description: 'AnalyzeIt plans: Free, Premium and VIP, billed via Razorpay in your local currency (INR in India). USD amounts are for reference; the exact price is confirmed at checkout.',
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  // Seed the quote for the visitor's country so the first HTML is already in their currency
  // (whole rupees in India), not the USD-only fallback shown before the browser fetch returns.
  const country =
    normalizeCountry((await headers()).get('x-vercel-ip-country')) ||
    normalizeCountry((await cookies()).get(COUNTRY_COOKIE)?.value) ||
    'IN';
  const quote = await loadMarketingQuote(country);
  return (
    <LegalLayout
      title="Fair pricing for quiet research."
      updated="September 25, 2026"
      eyebrow={false}
      showHeroUpdated={false}
      quietOperator
      subtitle="Paid plans are billed through Razorpay in your local currency (INR in India). The USD figure is a reference; the exact price is confirmed at checkout."
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
