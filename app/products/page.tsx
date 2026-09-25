import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '../Components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Products & pricing — AnalyzeIt',
  description: 'AnalyzeIt plans billed monthly in INR via Razorpay. USD amounts are for reference.',
};

const PLANS = [
  {
    name: 'Free',
    inr: '₹0',
    usd: '$0 USD reference',
    cadence: 'Monthly · no charge',
    tagline:
      'Personal research after you create an account. Enough to run the ask → tools → answer loop.',
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
    inr: '₹1,814.76',
    usd: '$19 USD reference',
    cadence: 'Billed monthly in INR via Razorpay',
    tagline: 'Deeper runs: better model, 3× tokens, ad-free research.',
    href: '/login?next=/billing',
    cta: 'Sign in to upgrade',
    popular: true,
    features: [
      'Everything in Free',
      'Better model + 3× tokens',
      '15 projects · 30 widgets',
      '500M context retention (memory)',
      '30-day artifact retention',
    ],
  },
  {
    name: 'VIP',
    inr: '₹4,680.18',
    usd: '$49 USD reference',
    cadence: 'Billed monthly in INR via Razorpay',
    tagline:
      'Heaviest research: 6× tokens, deep orchestrated context, priority when the agent is busy.',
    href: '/login?next=/billing',
    cta: 'Sign in to go VIP',
    features: [
      'Everything in Premium',
      '6× tokens · large model',
      'Deep · orchestrated context',
      '10 concurrent projects · 90-day artifacts',
      'Priority queue when the agent is busy',
    ],
  },
] as const;

export default function ProductsPage() {
  return (
    <LegalLayout
      title="Fair pricing for quiet research."
      updated="September 25, 2026"
      eyebrow={false}
      showHeroUpdated={false}
      quietOperator
      subtitle="Paid plans billed monthly in INR via Razorpay. USD is reference only — live INR quote at checkout."
    >
      <div className="grid gap-4 sm:grid-cols-3 items-stretch">
        {PLANS.map((plan) => {
          const isPremium = 'popular' in plan && plan.popular;
          const isFree = plan.name === 'Free';
          return (
            <article
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-5 ${
                isPremium
                  ? 'border-[#4A4238]/12 dark:border-[#3A3430] border-t-2 border-t-[#E3836C] bg-[#FFF9F3]/70 dark:bg-[#292522] shadow-[0_10px_28px_-14px_rgba(227,131,108,0.45)] -translate-y-0.5'
                  : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-white/40 dark:bg-[#211E1C]/60'
              }`}
            >
              <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{plan.name}</h2>
              <p className="mt-1 min-h-[2.75rem] text-sm text-[#5C534A] dark:text-[#C5B9AE]">
                {plan.tagline}
              </p>

              <div className="mt-4 min-h-[4.75rem]">
                <p className="font-serif text-3xl text-[#322C28] dark:text-[#F4EDE5]">
                  {plan.inr}
                  <span className="text-base font-sans">/mo</span>
                </p>
                <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]">{plan.usd}</p>
                <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]">{plan.cadence}</p>
              </div>

              <ul className="mt-4 mb-5 flex-1 space-y-1.5 text-sm">
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
                className={`mt-auto inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                  isFree
                    ? 'border border-[#E3836C]/55 bg-transparent text-[#C45A42] hover:border-[#E3836C] hover:bg-[#E3836C]/8'
                    : 'bg-[#EA8069] text-white hover:bg-[#C96551]'
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          );
        })}
      </div>

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
        <a href="/#pricing" className="text-[#E3836C] hover:underline">
          homepage pricing
        </a>
        .
      </p>
    </LegalLayout>
  );
}
