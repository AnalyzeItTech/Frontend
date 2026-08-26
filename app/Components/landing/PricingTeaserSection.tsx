'use client';

import React from 'react';
import Link from 'next/link';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

const TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    tagline: 'For solo founders and small projects finding initial clarity.',
    features: [
      'Up to 3 connected data sources',
      'Unlimited narrative queries',
      'Weekly scheduled digests',
      'Standard CSV and table exports',
    ],
    cta: 'Start 14-day trial',
  },
  {
    name: 'Team',
    price: '$149',
    period: '/month',
    tagline: 'For growing teams sharing insights across departments.',
    popular: true,
    features: [
      'Unlimited data sources & warehouses',
      'Shared team workspace & threads',
      'Slack & email digest integrations',
      'Granular role-based permissions',
      'Priority query engine',
    ],
    cta: 'Start 14-day trial',
  },
  {
    name: 'Custom',
    price: 'Contact',
    period: '',
    tagline: 'For organizations with custom infrastructure and dedicated support.',
    features: [
      'Custom database connectors',
      'Dedicated compute instance',
      'Custom SLA and onboarding',
      'Tailored security review',
    ],
    cta: 'Talk with us',
  },
];

export const PricingTeaserSection: React.FC = () => {
  return (
    <section
      id="pricing"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto"
    >
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4826A]" />
          Simple, Transparent Plans
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] font-normal">
          Fair pricing for quiet focus.
        </h2>
        <p className="text-base text-[#4A4238]/70">
          14-day free trial on all plans. No credit card required.
        </p>
      </div>

      {/* 3 Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-3xl p-8 md:p-10 flex flex-col justify-between space-y-8 transition-all duration-300 ${
              tier.popular
                ? 'bg-[#F3EDE4] border-2 border-[#D4826A] shadow-md relative'
                : 'glass-card border border-[#4A4238]/10 hover:border-[#4A4238]/20'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#D4826A] text-[#F3EDE4] text-xs font-mono uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl text-[#4A4238] font-normal">
                  {tier.name}
                </h3>
                <p className="text-xs text-[#4A4238]/70 mt-1">
                  {tier.tagline}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-serif text-4xl md:text-5xl text-[#4A4238] font-medium">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-[#4A4238]/60">{tier.period}</span>
                )}
              </div>

              {/* Feature List */}
              <div className="space-y-2.5 pt-4 border-t border-[#4A4238]/8">
                {tier.features.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-start gap-2.5 text-sm text-[#4A4238]/80"
                  >
                    <span className="text-[#8FA98F] text-sm">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/login"
              className={`w-full py-3 rounded-full text-center text-sm font-medium transition-all duration-200 ${
                tier.popular
                  ? 'bg-[#D4826A] hover:bg-[#C2735C] text-[#F3EDE4] shadow-xs'
                  : 'bg-[#4A4238] hover:bg-[#383129] text-[#F3EDE4]'
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
