'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBillingQuote, type BillingQuote } from '../lib/billingApi';
import { PLAN_FEATURES, PLAN_NAMES, PLAN_TAGLINES, USD_REFERENCE, priceLabel, priceNote } from '../lib/planCatalog.mjs';

const ORDER = ['free', 'premium', 'premium_plus'] as const;
const CTA = { free: 'Create a free account', premium: 'Sign in to upgrade', premium_plus: 'Sign in to go VIP' } as const;
const HREF = { free: '/login?tab=register', premium: '/login?next=/billing', premium_plus: '/login?next=/billing' } as const;

/** The same plans, features and live prices as the home page (one shared catalogue). */
export function ProductsPlans() {
  const [quote, setQuote] = useState<BillingQuote | null>(null);
  useEffect(() => {
    let cancelled = false;
    getBillingQuote('IN')
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-3">
      {ORDER.map((id) => {
        const usd = USD_REFERENCE[id];
        const row = id === 'free' ? undefined : quote?.plans?.[id];
        const recommended = id === 'premium';
        return (
          <article
            key={id}
            className={`flex flex-col rounded-2xl border p-5 ${
              recommended
                ? 'border-[#4A4238]/12 dark:border-[#3A3430] border-t-2 border-t-[#E3836C] bg-[#FFF9F3]/70 dark:bg-[#292522] shadow-[0_10px_28px_-14px_rgba(227,131,108,0.45)] -translate-y-0.5'
                : 'border-[#4A4238]/12 dark:border-[#3A3430] bg-white/40 dark:bg-[#211E1C]/60'
            }`}
          >
            <h2 className="font-serif text-2xl text-[#322C28] dark:text-[#F4EDE5]">{PLAN_NAMES[id]}</h2>
            <p className="mt-1 min-h-[2.75rem] text-sm text-[#5C534A] dark:text-[#C5B9AE]">{PLAN_TAGLINES[id]}</p>
            <div className="mt-4 min-h-[4.75rem]">
              <p className="font-serif text-3xl text-[#322C28] dark:text-[#F4EDE5]">
                {id === 'free' ? '₹0' : priceLabel(row, usd)}
                <span className="font-sans text-base">/mo</span>
              </p>
              <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]">{priceNote(row, usd)}</p>
            </div>
            <ul className="mb-5 mt-4 flex-1 space-y-1.5 text-sm">
              {PLAN_FEATURES[id].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[#C45A42]" aria-hidden>·</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={HREF[id]}
              className={`mt-auto inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                id === 'free'
                  ? 'border border-[#E3836C]/55 bg-transparent text-[#C45A42] hover:border-[#E3836C] hover:bg-[#E3836C]/8'
                  : 'bg-[#EA8069] text-white hover:bg-[#C96551]'
              }`}
            >
              {CTA[id]}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
