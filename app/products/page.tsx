import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';
import { GSTIN } from '../lib/legalEntity';

export const metadata: Metadata = {
  title: 'Products & pricing — AnalyzeIt',
  description: 'AnalyzeIt plans billed monthly in INR via PayU. USD amounts are for reference.',
};

const PLANS = [
  {
    name: 'Free',
    inr: '₹0',
    usd: '$0 USD reference',
    cadence: 'Monthly · no charge',
    href: '/login?tab=register',
    cta: 'Create a free account',
    features: [
      'Requires an AnalyzeIt account',
      'Core Chat + research loop',
      '3 projects · 12 widgets',
      '1× daily tokens · smaller model',
      '7-day artifact retention',
    ],
  },
  {
    name: 'Premium',
    inr: '₹4,775.69',
    usd: '$50 USD reference',
    cadence: 'Billed monthly in INR via PayU',
    href: '/login?next=/billing',
    cta: 'Sign in to upgrade',
    popular: true,
    features: [
      'Everything in Free',
      'Better model + 3× tokens',
      '15 projects · 30 widgets',
      '30-day artifact retention',
    ],
  },
  {
    name: 'Premium Plus',
    inr: '₹9,551.38',
    usd: '$100 USD reference',
    cadence: 'Billed monthly in INR via PayU',
    href: '/login?next=/billing',
    cta: 'Sign in to go Plus',
    features: [
      'Everything in Premium',
      '6× tokens · large model',
      '10 concurrent projects · 90-day artifacts',
      'Priority queue when the agent is busy',
    ],
  },
];

export default function ProductsPage() {
  return (
    <LegalLayout title="Products" updated="September 11, 2026">
      <p>
        AnalyzeIt is a digital analytics workspace. Paid plans are charged in{' '}
        <strong>INR via PayU</strong>. USD figures are for reference only. Live checkout amounts
        may vary slightly with FX at the time of payment.
      </p>
      {GSTIN ? <p className="text-xs">GSTIN: {GSTIN}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-2xl border p-5 ${
              'popular' in plan && plan.popular
                ? 'border-[#E3836C]/40 bg-[#FFF9F3] dark:bg-[#292522]'
                : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-white/40 dark:bg-[#211E1C]/60'
            }`}
          >
            <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{plan.name}</h2>
            <p className="mt-2 font-serif text-3xl text-[#322C28] dark:text-[#F4EDE5]">{plan.inr}<span className="text-base font-sans">/mo</span></p>
            <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]">{plan.usd}</p>
            <p className="mb-4 text-xs text-[#5C534A] dark:text-[#C5B9AE]">{plan.cadence}</p>
            <ul className="mb-5 flex-1 space-y-1.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[#C45A42]" aria-hidden>
                    ·
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#EA8069] px-4 text-sm font-medium text-white hover:bg-[#C96551]"
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>

      <p className="text-xs">
        Compare on the homepage{' '}
        <a href="/#pricing" className="text-[#E3836C] hover:underline">
          pricing section
        </a>
        . Refunds and cancellations:{' '}
        <a href="/refund" className="text-[#E3836C] hover:underline">
          Refund policy
        </a>
        . Delivery:{' '}
        <a href="/shipping" className="text-[#E3836C] hover:underline">
          Shipping policy
        </a>
        .
      </p>
    </LegalLayout>
  );
}
