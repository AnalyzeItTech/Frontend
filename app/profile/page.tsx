'use client';

import Link from 'next/link';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';
import { ProjectsManager } from '../Components/app/ProjectsManager';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  changePassword,
  fetchMe,
  getStoredToken,
  updateUserProfile,
  type UserProfile,
} from '../lib/auth';
import { cancelSubscription, getBillingHistory, getEntitlements } from '../lib/billingApi';
import { getUserUsage, type UserUsageData } from '../lib/exportApi';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { IncognitoToggle } from '../Components/ui/IncognitoToggle';

function ProfileInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, unknown> | null>(null);
  const [usage, setUsage] = useState<UserUsageData | null>(null);
  const [history, setHistory] = useState<
    Array<{ txnid: string; event: string; applied: string; created_at: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/profile');
      return;
    }
    void (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        setEditName(me?.name || '');
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

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash === '#projects') {
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [user]);

  const used = Number(entitlements?.tokens_used_today || 0);
  const cap = Number(entitlements?.tokens_per_day || 0);
  const tier = String(user?.tier || entitlements?.tier || 'free');
  const projectLimit = Number(entitlements?.project_limit || 0) || null;
  const usagePct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editName.trim() || savingName) return;
    setSavingName(true);
    setError(null);
    setNote(null);
    try {
      const updated = await updateUserProfile({ name: editName.trim() });
      setUser(updated);
      setNote('Display name updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update name');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPass || !newPass || savingPass) return;
    if (newPass !== confirmPass) {
      setError('New passwords do not match.');
      return;
    }
    if (newPass.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSavingPass(true);
    setError(null);
    setNote(null);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setNote('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <PageTitle title="Profile" />
          <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
            Manage your account, security, appearance, and analysis workspaces.
          </p>
        </motion.div>

        {params.get('upgraded') ? (
          <p className="rounded-xl bg-[#8FA98F]/20 px-3 py-2 text-sm">
            Plan updated. Entitlements below are from the server.
          </p>
        ) : null}
        {note ? (
          <p className="rounded-xl bg-[#8FA98F]/15 px-3 py-2 text-sm text-[#4A7C59] dark:text-[#9EBB9A]">
            {note}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl bg-[#9B4D3B]/10 px-3 py-2 text-sm text-[#9B4D3B]">
            {error}
          </p>
        ) : null}

        {!user ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04, duration: 0.28 }}
              className="app-card space-y-4 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">Account</h2>
                  <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                </div>
                <span className="tier-badge">{tier.replace(/_/g, ' ')}</span>
              </div>
              <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Display name
                  </span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingName || !editName.trim() || editName.trim() === (user.name || '')}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  {savingName ? 'Saving…' : 'Save name'}
                </button>
              </form>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.28 }}
              className="app-card space-y-4 p-5"
            >
              <div>
                <h2 className="text-sm font-medium">Security</h2>
                <p className="text-xs text-[var(--text-muted)]">Change the password for this account.</p>
              </div>
              <form onSubmit={savePassword} className="grid gap-2 sm:grid-cols-2">
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)] sm:col-span-2"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password (min 8)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
                />
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingPass || !currentPass || !newPass}
                    className="btn-primary text-xs disabled:opacity-40"
                  >
                    {savingPass ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.28 }}
              className="app-card space-y-4 p-5"
            >
              <div>
                <h2 className="text-sm font-medium">Appearance</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Theme and session privacy apply across Chat, Globe, and Dashboard.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeToggle showLabel />
                <IncognitoToggle showLabel />
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.28 }}
              className="app-card space-y-4 p-5"
            >
              <h2 className="text-sm font-medium">Usage against limits</h2>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Tokens today</span>
                  <span>
                    {used.toLocaleString()} / {cap.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <motion.div
                    className="h-full rounded-full bg-[var(--coral,#EA8069)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePct}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Lifetime runs {usage?.total_runs ?? '—'}
                {projectCount != null ? ` · ${projectCount} projects` : ''}
                {projectLimit ? ` (cap ${projectLimit})` : ''}
                {' · '}
                widgets cap {String(entitlements?.dashboard_widget_caps ?? '—')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/billing" className="btn-primary text-xs">
                  Upgrade
                </Link>
                <button
                  type="button"
                  disabled={busy || tier === 'free'}
                  className="btn-secondary text-xs disabled:opacity-40"
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await cancelSubscription();
                      const me = await fetchMe();
                      setUser(me);
                      setEntitlements(await getEntitlements());
                      setNote('Cancellation scheduled for period end.');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Cancel failed');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Cancel at period end
                </button>
              </div>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.28 }}
            >
              <ProjectsManager
                projectLimit={projectLimit}
                onCountChange={setProjectCount}
              />
            </motion.div>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.28 }}
              className="space-y-2"
            >
              <h2 className="text-sm font-medium">Billing history</h2>
              {history.length === 0 ? (
                <div className="app-card flex flex-col items-start gap-3 p-5">
                  <p className="text-sm text-[var(--text-muted)]">
                    No billing events yet. When you upgrade or renew, receipts show up here.
                  </p>
                  <Link href="/billing" className="btn-primary">
                    View plans
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((row) => (
                    <li
                      key={`${row.txnid}-${row.created_at}`}
                      className="rounded-xl border border-[var(--border)] px-3 py-2"
                    >
                      <span className="font-mono text-xs">{row.event}</span> → {row.applied}
                      <div className="text-xs text-[var(--text-muted)]">{row.created_at}</div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </div>
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
