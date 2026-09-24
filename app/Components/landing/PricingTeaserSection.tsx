'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingQuote, type BillingQuote } from '../../lib/billingApi';

type TierCard = {
  name: string;
  planId?: 'premium' | 'premium_plus';
  price: string;
  period: string;
  currencyNote: string;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta: string;
  href: string;
};

const FREE_TIER: TierCard = {
  name: 'Free',
  price: '₹0',
  period: '/mo',
  currencyNote: 'INR · billed as ₹0',
  tagline: 'Personal research after you create an account.',
  features: [
    'Requires an AnalyzeIt account',
    'Core Chat + research loop',
    '3 projects · 12 widgets',
    '1× daily tokens · smaller model',
    'Sponsored units after research runs',
    '7-day artifact retention',
    '250M context retention tokens',
  ],
  cta: 'Create a free account',
  href: '/login?tab=register',
};

const PAID_BASE: Omit<TierCard, 'price' | 'currencyNote'>[] = [
  {
    name: 'Premium',
    planId: 'premium',
    period: '/mo',
    tagline: 'Better model and 3× token budget for deeper analysis.',
    popular: true,
    features: [
      'Everything in Free',
      'Better model + 3× tokens',
      '15 projects · 30 widgets',
      '500M context retention tokens',
      'Ad-free research',
      'Personal link: yourname.analyzeit.in',
      '30-day artifact retention',
      'Monthly billing after you sign in',
    ],
    cta: 'Sign in to upgrade',
    href: '/login?next=/billing',
  },
  {
    name: 'Premium Plus',
    planId: 'premium_plus',
    period: '/mo',
    tagline: '6× tokens, longer retention, more concurrent projects.',
    features: [
      'Everything in Premium',
      '6× tokens · large model',
      '10 concurrent projects · 90-day artifacts',
      '1B context retention · account-wide memory',
      'Ad-free + personal dashboard link',
      'Deep · orchestrated context (RLM-style inspect)',
      'Priority queue when the agent is busy',
      'Monthly billing after you sign in',
    ],
    cta: 'Sign in to go Plus',
    href: '/login?next=/billing',
  },
];

function displayAmount(row: BillingQuote['plans']['premium'] | undefined, fallbackUsd: number): string {
  if (!row || row.amount == null || !Number.isFinite(Number(row.amount))) {
    return `$${fallbackUsd}`;
  }
  if (typeof row.amount_display === 'string' && row.amount_display.trim()) {
    return row.amount_display.trim();
  }
  const ccy = row.currency || 'INR';
  const n = Number(row.amount);
  if (ccy === 'INR') {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${ccy} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currencyNote(row: BillingQuote['plans']['premium'] | undefined, fallbackUsd: number): string {
  if (!row || row.amount == null || !Number.isFinite(Number(row.amount))) {
    return `USD reference · live INR on Billing after sign-in (≈$${fallbackUsd})`;
  }
  const usd =
    row.amount_usd != null && Number.isFinite(row.amount_usd)
      ? ` · $${row.amount_usd} USD reference`
      : ` · $${fallbackUsd} USD reference`;
  return `${row.currency || 'INR'} via Razorpay${usd}`;
}

export const PricingTeaserSection: React.FC = () => {
  const [quote, setQuote] = useState<BillingQuote | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Razorpay India checkout — keep marketing aligned with Billing INR quotes.
        const q = await getBillingQuote('IN');
        if (!cancelled) setQuote(q);
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tiers: TierCard[] = [
    FREE_TIER,
    ...PAID_BASE.map((base) => {
      const fallbackUsd = base.planId === 'premium_plus' ? 100 : 50;
      const row = base.planId ? quote?.plans?.[base.planId] : undefined;
      return {
        ...base,
        price: displayAmount(row, fallbackUsd),
        currencyNote: currencyNote(row, fallbackUsd),
      };
    }),
  ];

  return (
    <section
      id="pricing"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto scroll-mt-[calc(var(--nav-h,96px)+16px)]"
    >
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-[#C45A42]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C]" />
          Plans
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#322C28] dark:text-[#F4EDE5] font-normal">
          Fair pricing for quiet research.
        </h2>
        <p className="text-base text-[#3F3830] dark:text-[#E6DCD2]">
          Chat, dashboards, globe, and connectors require an account. Paid plans are billed monthly
          through Razorpay in INR; amounts below match live Billing quotes. Failed renewals keep
          entitlements for 7 days, then Free.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-3xl border p-7 ${
              tier.popular
                ? 'border-[#E3836C]/40 bg-[#FFF9F3] dark:bg-[#292522] shadow-lg'
                : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-[#F3EDE4]/50 dark:bg-[#211E1C]/60'
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E3836C] text-white">
                Most used
              </span>
            )}
            <div className="space-y-1 mb-6">
              <h3 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{tier.name}</h3>
              <p className="text-sm text-[#3F3830] dark:text-[#C5B9AE]">{tier.tagline}</p>
            </div>
            <div className="mb-2">
              <span className="font-serif text-4xl text-[#322C28] dark:text-[#F4EDE5]">{tier.price}</span>
              <span className="text-sm text-[#5C534A] dark:text-[#C5B9AE]">{tier.period}</span>
            </div>
            <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE] mb-6 leading-relaxed">{tier.currencyNote}</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="text-sm text-[#3F3830] dark:text-[#C5B9AE] flex gap-2">
                  <span className="text-[#C45A42]" aria-hidden="true">
                    ·
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              className={`inline-flex justify-center min-h-11 items-center rounded-full px-5 py-3 text-sm font-medium transition ${
                tier.name === 'Free'
                  ? 'border border-[#4A4238]/20 dark:border-[#504740] text-[#322C28] dark:text-[#F4EDE5] hover:border-[var(--coral,#E3836C)] hover:text-[var(--coral,#E3836C)]'
                  : 'bg-[var(--coral,#E3836C)] text-white hover:bg-[#ED967F]'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
