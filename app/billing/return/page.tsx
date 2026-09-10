'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { fetchMe } from '../../lib/auth';

function BillingReturnInner() {
  const params = useSearchParams();
  const failed = params.get('failed');
  const [note, setNote] = useState('Finishing payment…');

  useEffect(() => {
    if (failed) {
      setNote('Payment did not complete. You can try again from billing.');
      return;
    }
    void fetchMe().then(() => setNote('Payment recorded. Your plan is on your profile.'));
  }, [failed]);

  return (
    <main className="mx-auto max-w-lg space-y-4 px-6 py-16 text-[#4A4238]">
      <h1 className="font-serif text-3xl">PayU return</h1>
      <p className="text-sm text-[#6B6155]">{note}</p>
      <div className="flex gap-3 text-sm">
        <Link href="/profile" className="text-[#E3836C]">
          Profile
        </Link>
        <Link href="/billing">Billing</Link>
      </div>
    </main>
  );
}

export default function BillingReturnPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-sm">Loading payment result…</main>}>
      <BillingReturnInner />
    </Suspense>
  );
}
