'use client';

import Link from 'next/link';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { fetchMe, getStoredToken, type UserProfile } from '../lib/auth';
import { cancelSubscription, getBillingHistory, getEntitlements } from '../lib/billingApi';
import { getUserUsage, type UserUsageData } from '../lib/exportApi';

function ProfileInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<UserUsageData | null>(null);
  const [history, setHistory] = useState<Array<{ txnid: string; event: string; applied: string; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/profile');
      return;
    }
    void (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        const [ent, use, hist] = await Promise.all([
          getEntitlements(),
          getUserUsage(),
          getBillingHistory(),
        ]);
        setEntitlements(ent);
        setUsage(use);
        setHistory(hist.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load profile');
      }
    })();
  }, [router]);

  const used = Number(entitlements?.tokens_used_today || 0);
  const cap = Number(entitlements?.tokens_per_day || 0);
  const tier = String(user?.tier || entitlements?.tier || 'free');

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-2xl space-y-8">
        <PageTitle title="Profile" />
      {params.get('upgraded') ? (
        <p className="rounded-xl bg-[#8FA98F]/20 px-3 py-2 text-sm">Plan updated. Entitlements below are from the server.</p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-[#9B4D3B]">{error}</p> : null}
      {!user ? (
        <p className="text-sm text-[#6B6155]">Loading…</p>
      ) : (
        <>
          <section className="app-card space-y-1 p-5">
            <h2 className="text-sm font-medium">Account</h2>
            <p className="text-lg">{user.name || '—'}</p>
            <p className="text-sm text-[#6B6155]">{user.email}</p>
            <p className="text-xs font-mono uppercase tracking-wider text-[#8F8477]">
              <span className="tier-badge">Tier: {tier.replace('_', ' ')}</span>
            </p>
          </section>
          <section className="app-card space-y-4 p-5">
            <h2 className="text-sm font-medium">Usage against limits</h2>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#8F8477]">Today</p>
              <p className="text-sm text-[#6B6155]">
                Tokens {used.toLocaleString()} / {cap.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#8F8477]">Lifetime</p>
              <p className="text-sm text-[#6B6155]">
                Runs {usage?.total_runs ?? '—'}
              </p>
            </div>
            <p className="text-sm text-[#6B6155]">
              Projects cap {String(entitlements?.project_limit ?? '—')} · widgets cap {String(entitlements?.dashboard_widget_caps ?? '—')}
            </p>
          </section>
          <section className="flex flex-wrap gap-3">
            <Link href="/billing" className="btn-primary">
              Upgrade
            </Link>
            <button
              type="button"
              disabled={busy || tier === 'free'}
              className="btn-secondary disabled:opacity-40"
              onClick={async () => {
                setBusy(true);
                try {
                  await cancelSubscription();
                  const me = await fetchMe();
                  setUser(me);
                  setEntitlements(await getEntitlements());
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Cancel failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cancel at period end
            </button>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Billing history</h2>
            {history.length === 0 ? (
              <div className="app-card space-y-2 p-4">
                <p className="text-sm text-[#6B6155]">No billing events yet.</p>
                <p className="text-xs text-[#8F8477]">
                  Invoices and plan changes will show up here after a checkout or upgrade.
                </p>
                <Link href="/billing" className="inline-block text-sm text-[#E3836C] hover:underline">
                  View plans
                </Link>
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((row) => (
                  <li key={`${row.txnid}-${row.created_at}`} className="rounded-xl border border-[#4A4238]/10 px-3 py-2">
                    <span className="font-mono text-xs">{row.event}</span> → {row.applied}
                    <div className="text-xs text-[#8F8477]">{row.created_at}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="px-6 py-16 text-sm">Loading profile…</main>}>
      <ProfileInner />
    </Suspense>
  );
}
