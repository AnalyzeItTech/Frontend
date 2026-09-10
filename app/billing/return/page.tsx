'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { fetchMe, getStoredUser } from '../../lib/auth';
import { getCheckoutStatus } from '../../lib/billingApi';
import { AppShell } from '../../Components/app/AppShell';
import { PageTitle } from '../../Components/app/PageTitle';

function BillingReturnInner() {
  const params = useSearchParams();
  const failed = params.get('failed');
  const verified = params.get('verified');
  const txn = params.get('txn');
  const reason = params.get('reason');
  const [note, setNote] = useState('Checking payment with PayU…');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      if (failed) {
        setPaid(false);
        setNote(
          reason === 'verify'
            ? 'We could not confirm this payment with PayU yet. If you were charged, contact support with your transaction id.'
            : 'Payment did not complete. You can try again from billing.',
        );
        return;
      }

      // Browser redirect alone is not proof — confirm checkout status / entitlements.
      if (txn) {
        try {
          const status = await getCheckoutStatus(txn);
          if (cancelled) return;
          if (status.paid) {
            setPaid(true);
            await fetchMe();
            setNote('Payment verified with PayU. Your plan is active on your profile.');
            return;
          }
        } catch {
          /* fall through to fetchMe */
        }
      }

      const me = await fetchMe().catch(() => getStoredUser());
      if (cancelled) return;
      const tier = (me?.tier || '').toLowerCase();
      if (verified === '1' && tier && tier !== 'free') {
        setPaid(true);
        setNote('Payment verified with PayU. Your plan is active on your profile.');
      } else if (verified === '1') {
        setPaid(false);
        setNote(
          'Return received, but your plan is not upgraded yet. Wait a moment and refresh profile — or contact support with your txn id.',
        );
      } else {
        setPaid(false);
        setNote('No verified payment found for this return. Open billing to try again.');
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [failed, verified, txn, reason]);

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-lg space-y-4">
        <PageTitle title={failed ? 'Payment incomplete' : 'Payment return'} />
        <p className="text-sm text-[var(--text-secondary)]">{note}</p>
        {txn ? (
          <p className="font-mono text-[11px] text-[var(--text-muted)]">txn: {txn}</p>
        ) : null}
        <div className="flex gap-3 text-sm">
          <Link href="/profile" className="text-[#E3836C]">
            Profile
          </Link>
          <Link href="/billing">{paid ? 'Manage billing' : 'Try again'}</Link>
        </div>
      </div>
    </AppShell>
  );
}

export default function BillingReturnPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-sm">Loading payment result…</main>}>
      <BillingReturnInner />
    </Suspense>
  );
}
