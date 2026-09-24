'use client';

import Link from 'next/link';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMe, getStoredToken, type UserProfile } from '../lib/auth';
import {
  coerceMoney,
  formatMoney,
  getBillingQuote,
  isValidMoney,
  openRazorpayCheckout,
  startCheckout,
  startTrial,
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
      '500M context retention tokens',
      'Ad-free · personal dashboard link',
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
      '1B context retention · account-wide memory',
      'Ad-free · personal dashboard link',
      'Priority queue when the agent is busy',
    ],
  },
};

/** Razorpay charges INR; USD is reference only (matches marketing /#pricing). */
const CHECKOUT_COUNTRY = 'IN';

function planAmount(quote: BillingQuote | null, plan: PlanId): number | null {
  const row = quote?.plans?.[plan];
  return coerceMoney(row?.amount);
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
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = useState<PlanId | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [trialNotice, setTrialNotice] = useState<string | null>(null);

  const loadQuote = () => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    setQuoteLoading(true);
    void getBillingQuote(CHECKOUT_COUNTRY)
      .then((q) => {
        setQuote(q);
        setQuoteError(null);
      })
      .catch((err) => {
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : 'Could not load prices');
      })
      .finally(() => setQuoteLoading(false));
  };

  const loadMe = () => {
    if (!getStoredToken()) return;
    void fetchMe()
      .then((user) => setMe(user))
      .catch(() => setMe(null));
  };

  useEffect(() => {
    loadQuote();
    loadMe();
    const onShow = () => {
      loadQuote();
      loadMe();
    };
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const review = useMemo(() => {
    if (!reviewPlan) return null;
    const meta = PLAN_COPY[reviewPlan];
    const amount = planAmount(quote, reviewPlan);
    const currency = planCurrency(quote, reviewPlan);
    return { plan: reviewPlan, meta, amount, currency };
  }, [reviewPlan, quote]);

  const trialEligible = Boolean(
    me && !me.trial_used && me.trial_status !== 'active' && me.tier === 'free',
  );
  const trialActive = me?.trial_status === 'active';

  const openReview = (plan: PlanId) => {
    setError(null);
    setTrialNotice(null);
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    const amount = planAmount(quote, plan);
    if (amount == null) {
      setError('Price is unavailable right now. Refresh and try again.');
      return;
    }
    setReviewPlan(plan);
  };

  const onStartTrial = async () => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    setBusy(true);
    setError(null);
    setTrialNotice(null);
    try {
      const result = await startTrial('premium');
      await fetchMe().then((user) => setMe(user));
      setTrialNotice(
        result.trial_ends_at
          ? `Premium trial is on through ${new Date(result.trial_ends_at).toLocaleDateString()}.`
          : 'Premium trial is active.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start trial');
    } finally {
      setBusy(false);
    }
  };

  const confirmRazorpay = async () => {
    if (!reviewPlan) return;
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    const amount = planAmount(quote, reviewPlan);
    if (amount == null) {
      setError('Price is unavailable. Checkout was not opened.');
      setReviewPlan(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const session: CheckoutSession = await startCheckout(reviewPlan, CHECKOUT_COUNTRY);
      if (!isValidMoney(session.amount) || !session.order_id) {
        throw new Error('Server returned an invalid checkout. Razorpay was not opened.');
      }
      const outcome = await openRazorpayCheckout(session);
      if (outcome === 'cancelled') {
        setError('Payment cancelled.');
        return;
      }
      await fetchMe();
      router.push('/profile?upgraded=1');
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
          Paid plans are charged in <strong className="font-medium text-[var(--text,#3A342D)]">INR via Razorpay</strong>.
          USD amounts are for reference only — same story as{' '}
          <Link href="/#pricing" className="underline underline-offset-2 hover:text-[#C45A42]">
            marketing pricing
          </Link>
          .
        </p>

        {me ? (
          <div className="app-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Current plan</p>
              <p className="text-sm font-medium text-[var(--text)]">
                {(me.tier || 'free').replace(/_/g, ' ')}
                {trialActive ? ' · trial' : ''}
              </p>
            </div>
            {me.tier === 'free' || trialActive ? (
              <p className="text-xs text-[var(--text-muted)]">Upgrade below when you are ready.</p>
            ) : (
              <Link href="/profile" className="btn-ghost text-xs">
                Manage in profile
              </Link>
            )}
          </div>
        ) : null}

        {trialEligible ? (
          <section className="rounded-xl border border-[var(--border,#D9CFC0)] bg-[var(--surface-muted,#EEE4D6)]/50 px-4 py-3 space-y-2">
            <h2 className="font-serif text-lg text-[var(--text,#322C28)]">Try Premium free for 7 days</h2>
            <p className="text-sm text-[var(--text-muted,#6B6155)]">
              One trial per account. No card required — after seven days you return to Free unless you upgrade.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStartTrial()}
              className="btn-secondary disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start free trial'}
            </button>
          </section>
        ) : null}

        {trialActive && me?.trial_ends_at ? (
          <p className="text-sm text-[var(--text-muted,#6B6155)]">
            Premium trial active until{' '}
            <strong className="font-medium text-[var(--text,#3A342D)]">
              {new Date(me.trial_ends_at).toLocaleDateString()}
            </strong>
            .
          </p>
        ) : null}

        {trialNotice ? (
          <p role="status" className="text-sm text-[var(--text,#3A342D)]">
            {trialNotice}
          </p>
        ) : null}

        {quoteError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C45B4A]/30 bg-[#C45B4A]/10 px-3 py-2 text-sm text-[#9B4D3B]"
          >
            <span>{quoteError}</span>
            <button type="button" className="btn-secondary text-xs" onClick={() => loadQuote()}>
              Retry prices
            </button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-[#C45B4A]/30 bg-[#C45B4A]/10 px-3 py-2 text-sm text-[#9B4D3B]">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {(['premium', 'premium_plus'] as PlanId[]).map((plan) => {
            const meta = PLAN_COPY[plan];
            const amount = plan === 'premium' ? premiumAmt : plusAmt;
            const ccy = plan === 'premium' ? premiumCcy : plusCcy;
            const ready = amount != null;
            const priceLabel = ready
              ? formatMoney(amount, ccy)
              : quoteLoading
                ? '…'
                : quoteError
                  ? 'Unavailable'
                  : '…';
            const ctaLabel = ready
              ? `Review ${meta.name}`
              : quoteLoading
                ? 'Loading price…'
                : 'Price unavailable';
            return (
              <section key={plan} className="app-card flex flex-col space-y-3 p-5">
                <div>
                  <h2 className="font-serif text-xl text-[var(--text,#322C28)]">{meta.name}</h2>
                  <p className="text-xs text-[var(--text-muted,#6B6155)]">{meta.cadence}</p>
                </div>
                <div>
                  <p className="font-serif text-3xl text-[var(--text,#322C28)]">{priceLabel}</p>
                  <p className="text-xs text-[var(--text-muted,#6B6155)]">
                    ${meta.usdList} USD reference · charged in {ccy} via Razorpay
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
                  disabled={busy || !ready || quoteLoading}
                  onClick={() => openReview(plan)}
                  className="btn-primary disabled:opacity-50"
                >
                  {ctaLabel}
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
          . You will confirm the charge in-app before Razorpay opens.
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
                Confirm details before opening Razorpay. Nothing is charged until you finish in the Razorpay window.
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
                onClick={() => void confirmRazorpay()}
              >
                {busy ? 'Opening Razorpay…' : 'Pay with Razorpay'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
