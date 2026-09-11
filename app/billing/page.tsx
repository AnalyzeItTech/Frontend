'use client';

import Link from 'next/link';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMe, getStoredToken } from '../lib/auth';
import {
  completeSandboxCheckout,
  formatMoney,
  getBillingQuote,
  isValidMoney,
  startCheckout,
  submitPayuForm,
  type BillingQuote,
  type CheckoutSession,
} from '../lib/billingApi';

type PlanId = 'premium' | 'premium_plus';

const PLAN_COPY: Record<
  PlanId,
  { name: string; usdList: number; cadence: string; perks: string[] }
> = {
  premium: {
    name: 'Premium',
    usdList: 50,
    cadence: 'Billed monthly',
    perks: [
      'Better model + 3× daily tokens',
      '15 projects · 30 widgets',
      '30-day artifact retention',
    ],
  },
  premium_plus: {
    name: 'Premium Plus',
    usdList: 100,
    cadence: 'Billed monthly',
    perks: [
      'Large model + 6× daily tokens',
      '10 concurrent projects · 90-day artifacts',
      'Priority queue when the agent is busy',
    ],
  },
};

/** PayU India charges INR; USD is reference only (matches marketing /#pricing). */
const CHECKOUT_COUNTRY = 'IN';

function planAmount(quote: BillingQuote | null, plan: PlanId): number | null {
  const row = quote?.plans?.[plan];
  if (!row || !isValidMoney(row.amount)) return null;
  return row.amount;
}

function planCurrency(quote: BillingQuote | null, plan: PlanId): string {
  const row = quote?.plans?.[plan];
  const code = (row?.currency || 'INR').toUpperCase();
  return code || 'INR';
}

export default function BillingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<BillingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    void getBillingQuote(CHECKOUT_COUNTRY)
      .then((q) => {
        setQuote(q);
        setQuoteError(null);
      })
      .catch((err) => {
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : 'Could not load prices');
      });
  }, [router]);

  const review = useMemo(() => {
    if (!reviewPlan) return null;
    const meta = PLAN_COPY[reviewPlan];
    const amount = planAmount(quote, reviewPlan);
    const currency = planCurrency(quote, reviewPlan);
    return { plan: reviewPlan, meta, amount, currency };
  }, [reviewPlan, quote]);

  const openReview = (plan: PlanId) => {
    setError(null);
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    const amount = planAmount(quote, plan);
    if (amount == null) {
      setError('Price is unavailable right now. Refresh and try again — we will not open PayU with an invalid amount.');
      return;
    }
    setReviewPlan(plan);
  };

  const confirmPayu = async () => {
    if (!reviewPlan) return;
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    const amount = planAmount(quote, reviewPlan);
    if (amount == null) {
      setError('Price is unavailable. Checkout blocked to avoid a PayU NaN total.');
      setReviewPlan(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session: CheckoutSession = await startCheckout(reviewPlan, CHECKOUT_COUNTRY);
      if (!isValidMoney(session.amount)) {
        throw new Error('Server returned an invalid checkout amount. PayU was not opened.');
      }
      if (session.payu_fields && session.payu_url) {
        submitPayuForm(session.payu_url, session.payu_fields);
        return;
      }
      if (session.sandbox) {
        await completeSandboxCheckout(session.txnid, session.plan);
        await fetchMe();
        router.push('/profile?upgraded=1');
        return;
      }
      setError('PayU is not configured on the server, so checkout cannot continue.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setBusy(false);
    }
  };

  const premiumAmt = planAmount(quote, 'premium');
  const plusAmt = planAmount(quote, 'premium_plus');
  const premiumCcy = planCurrency(quote, 'premium');
  const plusCcy = planCurrency(quote, 'premium_plus');

  return (
    <AppShell active="billing">
      <div className="mx-auto max-w-2xl space-y-6">
        <PageTitle title="Billing" />
        <p className="text-sm text-[var(--text-muted,#6B6155)]">
          Paid plans are charged in <strong className="font-medium text-[var(--text,#3A342D)]">INR via PayU</strong>.
          USD amounts are for reference only — same story as{' '}
          <Link href="/#pricing" className="underline underline-offset-2 hover:text-[#C45A42]">
            marketing pricing
          </Link>
          .
        </p>

        {quoteError ? (
          <p role="alert" className="rounded-xl border border-[#C45B4A]/30 bg-[#C45B4A]/10 px-3 py-2 text-sm text-[#9B4D3B]">
            {quoteError}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-[#9B4D3B]">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {(['premium', 'premium_plus'] as PlanId[]).map((plan) => {
            const meta = PLAN_COPY[plan];
            const amount = plan === 'premium' ? premiumAmt : plusAmt;
            const ccy = plan === 'premium' ? premiumCcy : plusCcy;
            const ready = amount != null;
            return (
              <section key={plan} className="app-card flex flex-col space-y-3 p-5">
                <div>
                  <h2 className="font-serif text-xl text-[var(--text,#322C28)]">{meta.name}</h2>
                  <p className="text-xs text-[var(--text-muted,#6B6155)]">{meta.cadence}</p>
                </div>
                <div>
                  <p className="font-serif text-3xl text-[var(--text,#322C28)]">
                    {ready ? formatMoney(amount, ccy) : '—'}
                  </p>
                  <p className="text-xs text-[var(--text-muted,#6B6155)]">
                    ${meta.usdList} USD reference · charged in {ccy} via PayU
                  </p>
                </div>
                <ul className="flex-1 space-y-1.5 text-sm text-[var(--text-muted,#6B6155)]">
                  {meta.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="text-[#C45A42]" aria-hidden>
                        ·
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={() => openReview(plan)}
                  className="btn-primary disabled:opacity-50"
                >
                  {ready ? `Review ${meta.name}` : 'Price unavailable'}
                </button>
              </section>
            );
          })}
        </div>

        <p className="text-xs text-[var(--text-muted,#6B6155)]">
          Compare features on the{' '}
          <Link href="/#pricing" className="underline underline-offset-2 hover:text-[#C45A42]">
            pricing section
          </Link>
          . You will confirm the charge in-app before PayU opens.
        </p>
      </div>

      {review ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-purchase-title"
        >
          <div className="app-card w-full max-w-md space-y-4 p-5 shadow-xl">
            <div className="space-y-1">
              <h2 id="review-purchase-title" className="font-serif text-2xl text-[var(--text,#322C28)]">
                Review purchase
              </h2>
              <p className="text-sm text-[var(--text-muted,#6B6155)]">
                Confirm details before opening PayU. Nothing is charged until you finish on PayU.
              </p>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted,#6B6155)]">Plan</dt>
                <dd className="font-medium text-[var(--text,#322C28)]">{review.meta.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted,#6B6155)]">Total payable</dt>
                <dd className="font-medium text-[var(--text,#322C28)]">
                  {formatMoney(review.amount, review.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted,#6B6155)]">Currency</dt>
                <dd className="text-[var(--text,#322C28)]">
                  {review.currency} (USD reference ${review.meta.usdList})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted,#6B6155)]">Cadence</dt>
                <dd className="text-[var(--text,#322C28)]">{review.meta.cadence}</dd>
              </div>
            </dl>
            <ul className="space-y-1 rounded-xl bg-[var(--surface-muted,#EEE4D6)]/60 px-3 py-2 text-xs text-[var(--text-muted,#6B6155)]">
              {review.meta.perks.map((perk) => (
                <li key={perk}>· {perk}</li>
              ))}
            </ul>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                className="btn-secondary disabled:opacity-50"
                onClick={() => setReviewPlan(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || review.amount == null}
                className="btn-primary disabled:opacity-50"
                onClick={() => void confirmPayu()}
              >
                {busy ? 'Opening PayU…' : 'Confirm and continue to PayU'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
