'use client';

import Link from 'next/link';
import { useState } from 'react';
import { fetchMe } from '../lib/auth';
import { completeSandboxCheckout, startCheckout } from '../lib/billingApi';

export default function BillingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upgrade = async (plan: 'premium' | 'premium_plus') => {
    setBusy(true);
    setError(null);
    try {
      const session = await startCheckout(plan);
      if (session.sandbox) {
        await completeSandboxCheckout(session.txnid, plan);
        await fetchMe();
        setMessage(`Upgraded to ${plan.replace('_', ' ')}. Entitlements are live.`);
      } else {
        setMessage('Continue on PayU with the returned checkout payload.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-16 text-[#4A4238]">
      <Link href="/research" className="text-sm text-[#E3836C]">
        Back to Research
      </Link>
      <h1 className="font-serif text-4xl">Upgrade</h1>
      <p className="text-sm text-[#6B6155]">
        Premium is $50 (3× tokens, better model). Premium Plus is $100 (6× tokens, longer artifact
        retention, more concurrent projects, priority queue).
      </p>
      {message ? <p className="rounded-xl bg-[#8FA98F]/20 px-3 py-2 text-sm">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-[#9B4D3B]">{error}</p> : null}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => void upgrade('premium')} className="rounded-full bg-[#E3836C] px-4 py-2 text-sm text-white">
          Premium $50
        </button>
        <button type="button" disabled={busy} onClick={() => void upgrade('premium_plus')} className="rounded-full border border-[#4A4238]/20 px-4 py-2 text-sm">
          Premium Plus $100
        </button>
      </div>
    </main>
  );
}
