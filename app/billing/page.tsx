'use client';

import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe, getStoredToken } from '../lib/auth';
import {
  completeSandboxCheckout,
  detectBillingCountry,
  getBillingQuote,
  startCheckout,
  submitPayuForm,
  type BillingQuote,
} from '../lib/billingApi';

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function BillingPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<BillingQuote | null>(null);
  const country = detectBillingCountry();

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    void getBillingQuote(country)
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [router, country]);

  const upgrade = async (plan: 'premium' | 'premium_plus') => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const session = await startCheckout(plan, country);
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

  const premium = quote?.plans.premium;
  const plus = quote?.plans.premium_plus;
  const ccy = premium?.currency || 'USD';

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-lg space-y-6">
        <PageTitle title="Upgrade" />
        <p className="text-sm text-[#6B6155]">
          Prices are converted to your local currency ({ccy}
          {quote?.country ? ` · ${quote.country}` : ''}). Premium is {formatPrice(premium?.amount ?? 50, ccy)}{' '}
          (3× tokens). Premium Plus is {formatPrice(plus?.amount ?? 100, ccy)} (6× tokens, longer artifact
          retention, more concurrent projects, priority queue).
          {premium?.amount_usd ? ` Base list price is $${premium.amount_usd} / $${plus?.amount_usd} USD.` : null}
        </p>
        {message ? <p className="rounded-xl bg-[#8FA98F]/20 px-3 py-2 text-sm">{message}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-[#9B4D3B]">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void upgrade('premium')}
            className="btn-primary disabled:opacity-50"
          >
            Premium {premium ? formatPrice(premium.amount, premium.currency) : '$50'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void upgrade('premium_plus')}
            className="btn-secondary disabled:opacity-50"
          >
            Premium Plus {plus ? formatPrice(plus.amount, plus.currency) : '$100'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
