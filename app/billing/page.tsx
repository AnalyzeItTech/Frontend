'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe, getStoredToken } from '../lib/auth';
import { completeSandboxCheckout, startCheckout, submitPayuForm } from '../lib/billingApi';

export default function BillingPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
    }
  }, [router]);

  const upgrade = async (plan: 'premium' | 'premium_plus') => {
    if (!getStoredToken()) {
      router.replace('/login?next=/billing');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const session = await startCheckout(plan);
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

  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-16 text-[#4A4238]">
      <Link href="/profile" className="text-sm text-[#E3836C]">
        Profile
      </Link>
      <h1 className="font-serif text-4xl">Upgrade</h1>
      <p className="text-sm text-[#6B6155]">
        You must be signed in. Premium is $50 (3× tokens). Premium Plus is $100 (6× tokens, longer
        artifact retention, more concurrent projects, priority queue).
      </p>
      {message ? <p className="rounded-xl bg-[#8FA98F]/20 px-3 py-2 text-sm">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-[#9B4D3B]">{error}</p> : null}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => void upgrade('premium')} className="rounded-full bg-[#E3836C] px-4 py-2 text-sm text-white disabled:opacity-50">
          Premium $50
        </button>
        <button type="button" disabled={busy} onClick={() => void upgrade('premium_plus')} className="rounded-full border border-[#4A4238]/20 px-4 py-2 text-sm disabled:opacity-50">
          Premium Plus $100
        </button>
      </div>
    </main>
  );
}
