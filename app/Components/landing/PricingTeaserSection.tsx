'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

/** Illustrative only — billing is not wired. CTAs go to account creation. */
const TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    tagline: 'Personal research with a smaller model and 1× tokens.',
    features: [
      'Core research loop',
      '3 projects · 12 widgets',
      '7-day artifact retention',
    ],
    cta: 'Start free',
  },
  {
    name: 'Premium',
    price: '$50',
    period: '/mo',
    tagline: 'Better model and 3× token budget for deeper analysis.',
    popular: true,
    features: [
      'Better model + 3× tokens',
      '15 projects · 30 widgets',
      '30-day artifact retention',
    ],
    cta: 'Upgrade',
  },
  {
    name: 'Premium Plus',
    price: '$100',
    period: '/mo',
    tagline: '6× tokens, longer retention, more concurrent projects, priority queue.',
    features: [
      '6× tokens · large model',
      '90-day artifacts · 10 concurrent projects',
      'Priority queue when the agent is busy',
    ],
    cta: 'Go Plus',
  },
];

export const PricingTeaserSection: React.FC = () => {
  return (
    <section
      id="pricing"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl mx-auto space-y-4"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C]" />
          Preview access
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
          Fair pricing for quiet research.
        </h2>
        <p className="text-base text-[#4A4238]/70 dark:text-[#C5B9AE]">
          Paid plans billed via PayU. Failed renewals keep entitlements for 7 days, then Free.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {TIERS.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
            transition={{ duration: 0.65, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex flex-col rounded-3xl border p-7 ${
              tier.popular
                ? 'border-[#E3836C]/40 bg-[#FFF9F3] dark:bg-[#292522] shadow-lg'
                : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-[#F3EDE4]/50 dark:bg-[#211E1C]/60'
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E3836C] text-white">
                Most used
              </span>
            )}
            <div className="space-y-1 mb-6">
              <h3 className="font-serif text-2xl text-[#4A4238] dark:text-[#F4EDE5]">{tier.name}</h3>
              <p className="text-sm text-[#4A4238]/65 dark:text-[#C5B9AE]">{tier.tagline}</p>
            </div>
            <div className="mb-6">
              <span className="font-serif text-4xl text-[#4A4238] dark:text-[#F4EDE5]">{tier.price}</span>
              {tier.period ? (
                <span className="text-sm text-[#4A4238]/50 dark:text-[#91867E]">{tier.period}</span>
              ) : null}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="text-sm text-[#4A4238]/75 dark:text-[#C5B9AE] flex gap-2">
                  <span className="text-[#E3836C]">·</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={tier.name === 'Free' ? '/login?tab=register' : '/login?next=/billing'}
              className={`inline-flex justify-center rounded-full px-5 py-3 text-sm font-medium transition ${
                tier.popular
                  ? 'bg-[#E3836C] text-white hover:bg-[#ED967F]'
                  : 'border border-[#4A4238]/20 dark:border-[#504740] text-[#4A4238] dark:text-[#F4EDE5] hover:border-[#E3836C]'
              }`}
            >
              {tier.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
