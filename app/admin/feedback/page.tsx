'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../Components/app/AppShell';
import { PageTitle } from '../../Components/app/PageTitle';
import { getStoredToken } from '../../lib/auth';
import {
  FEEDBACK_CATEGORIES,
  fetchAdminWhoami,
  listAdminFeedback,
  updateAdminFeedback,
  type FeedbackItem,
  type FeedbackStatus,
} from '../../lib/feedbackApi';

const STATUSES: FeedbackStatus[] = ['open', 'acknowledged', 'replied', 'closed'];

function AdminFeedbackInner() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('open');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listAdminFeedback({
        status: statusFilter || undefined,
        limit: 100,
      });
      setItems(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          if (next[row.id] === undefined) next[row.id] = row.admin_reply || '';
        }
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load feedback.');
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/admin/feedback');
      return;
    }
    void (async () => {
      const who = await fetchAdminWhoami();
      if (!who.is_admin) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      await load();
    })();
  }, [load, router]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const save = async (item: FeedbackItem, status?: FeedbackStatus) => {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateAdminFeedback(item.id, {
        status: status || item.status,
        admin_reply: drafts[item.id] ?? item.admin_reply ?? '',
      });
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (allowed === null) {
    return (
      <AppShell active="profile">
        <p className="p-6 text-sm text-[var(--text-muted)]">Checking access…</p>
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell active="profile">
        <div className="mx-auto max-w-lg p-8">
          <PageTitle title="Admin" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">This inbox is restricted.</p>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Your account is not on the admin allowlist. Set <code>ADMIN_EMAILS</code> on Backend A.
          </p>
          <Link href="/research" className="mt-4 inline-block text-sm text-[var(--coral,#EA8069)]">
            Back to chat
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="profile">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <PageTitle title="Feedback inbox" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            User notes from the in-app widget. Resend notifies you on each new item.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || '') as FeedbackStatus | '')}
              className="ml-2 rounded-full border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-2)]"
          >
            Refresh
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <ul className="space-y-4">
          {items.length === 0 ? (
            <li className="rounded-[var(--radius-card,14px)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
              No feedback in this filter.
            </li>
          ) : (
            items.map((item) => {
              const catLabel =
                FEEDBACK_CATEGORIES.find((c) => c.id === item.category)?.label || item.category;
              return (
                <li
                  key={item.id}
                  className="rounded-[var(--radius-card,14px)] border border-[var(--border)] bg-[var(--surface)] p-4 dark:bg-[var(--surface-1)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {catLabel}
                      <span className="ml-2 font-normal text-[var(--text-muted)]">
                        {item.user_name || item.user_email || item.user_id}
                      </span>
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.created_at?.slice(0, 19).replace('T', ' ')} · {item.status}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text)]">{item.message}</p>
                  {(item.route || item.project_id) && (
                    <p className="mt-2 truncate text-[11px] text-[var(--text-muted)]">
                      {item.route || '—'}
                      {item.project_id ? ` · ${item.project_id}` : ''}
                    </p>
                  )}
                  <textarea
                    value={drafts[item.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Internal reply / note"
                    className="mt-3 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void save(item, s)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          item.status === s
                            ? 'border-[var(--coral,#EA8069)] text-[var(--coral,#EA8069)]'
                            : 'border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void save(item)}
                      className="rounded-full bg-[var(--coral,#EA8069)] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {busyId === item.id ? 'Saving…' : 'Save reply'}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </AppShell>
  );
}

export default function AdminFeedbackPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="profile">
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading…</p>
        </AppShell>
      }
    >
      <AdminFeedbackInner />
    </Suspense>
  );
}
