'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingQuote } from '../../lib/billingApi';
import { presentPlans, type MarketingQuote } from '../../lib/planCatalog.mjs';
import { localPriceNote } from '../../lib/countryProfile.mjs';
import { useVisitorCountry } from '../../lib/useVisitorCountry';
import { CountryTrust } from '../trust/CountryTrust';

const CTA = { free: 'Create a free account', premium: 'Sign in to upgrade', premium_plus: 'Sign in to go VIP' } as const;
const HREF = { free: '/login?tab=register', premium: '/login?next=/billing', premium_plus: '/login?next=/billing' } as const;

export const PricingTeaserSection: React.FC<{ initialQuote?: MarketingQuote }> = ({ initialQuote = null }) => {
  const [quote, setQuote] = useState<MarketingQuote>(initialQuote ?? null);
  const country = useVisitorCountry();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Billing is INR for everyone; the visitor's country only adds a local-currency estimate.
        const q = await getBillingQuote(country ?? 'IN');
        if (!cancelled) setQuote(q);
      } catch {
        // Keep the quote already on screen. Dropping it would show USD after INR was known.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  const tiers = presentPlans(quote).map((plan) => ({
    ...plan,
    localNote: localPriceNote(plan.localEstimate, country),
    period: '/mo',
    popular: plan.id === 'premium',
    features: plan.id === 'free' ? plan.features : [...plan.features, 'Monthly billing after you sign in'],
    cta: CTA[plan.id],
    href: HREF[plan.id],
  }));

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
          Chat, dashboards, Globe, and connectors need an account. Paid plans are billed monthly in INR
          via Razorpay; the USD figure is a reference, and the exact INR price is confirmed at checkout.
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
                Recommended
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
            <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE] mb-6 leading-relaxed">
              {tier.note}
              {tier.localNote && <span className="block mt-1">{tier.localNote}</span>}
            </p>
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

      <CountryTrust className="max-w-4xl mx-auto" />

      <p className="text-center text-sm text-[#5C534A] dark:text-[#C5B9AE] max-w-2xl mx-auto">
        Hit a Free limit mid-research? Upgrade from Billing after sign-in — your work stays;
        entitlements change.
      </p>
    </section>
  );
};
