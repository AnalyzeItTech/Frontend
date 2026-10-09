'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBillingQuote } from '../lib/billingApi';
import { presentPlans, type MarketingQuote } from '../lib/planCatalog.mjs';
import { useVisitorCountry } from '../lib/useVisitorCountry';
import { CountryTrust } from '../Components/trust/CountryTrust';

const CTA = { free: 'Create a free account', premium: 'Sign in to upgrade', premium_plus: 'Sign in to go VIP' } as const;
const HREF = { free: '/login?tab=register', premium: '/login?next=/billing', premium_plus: '/login?next=/billing' } as const;

/**
 * Same plans, features and prices as the homepage.
 * `initialQuote` is the server-loaded India quote so the first HTML is whole rupees,
 * not the USD-only fallback the homepage has already replaced.
 */
export function ProductsPlans({ initialQuote = null }: { initialQuote?: MarketingQuote }) {
  const [quote, setQuote] = useState<MarketingQuote>(initialQuote ?? null);
  const country = useVisitorCountry();
  useEffect(() => {
    let cancelled = false;
    getBillingQuote(country ?? 'IN')
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        // Keep initialQuote. Clearing it would show Premium in USD after the server already had INR.
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return (
    <>
    <div className="grid items-stretch gap-4 sm:grid-cols-3">
      {presentPlans(quote).map((plan) => {
        const recommended = plan.id === 'premium';
        return (
          <article
            key={plan.id}
            className={`flex flex-col rounded-2xl border p-5 ${
              recommended
                ? 'border-[#4A4238]/12 dark:border-[#3A3430] border-t-2 border-t-[#E3836C] bg-[#FFF9F3]/70 dark:bg-[#292522] shadow-[0_10px_28px_-14px_rgba(227,131,108,0.45)] -translate-y-0.5'
                : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-white/40 dark:bg-[#211E1C]/60'
            }`}
          >
            <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{plan.name}</h2>
            <p className="mt-1 min-h-[2.75rem] text-sm text-[#5C534A] dark:text-[#C5B9AE]">{plan.tagline}</p>
            <div className="mt-4 min-h-[4.75rem]">
              <p className="font-serif text-3xl text-[#322C28] dark:text-[#F4EDE5]">
                {plan.price}
                <span className="font-sans text-base">/mo</span>
              </p>
              <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]">{plan.note}</p>
            </div>
            <ul className="mb-5 mt-4 flex-1 space-y-1.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[#C45A42]" aria-hidden>·</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={HREF[plan.id]}
              className={`mt-auto inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                plan.id === 'free'
                  ? 'border border-[#E3836C]/55 bg-transparent text-[#C45A42] hover:border-[#E3836C] hover:bg-[#E3836C]/8'
                  : 'bg-[#EA8069] text-white hover:bg-[#C96551]'
              }`}
            >
              {CTA[plan.id]}
            </Link>
          </article>
        );
      })}
    </div>
    <CountryTrust className="mt-6" />
    </>
  );
}
