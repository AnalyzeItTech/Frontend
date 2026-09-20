'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { IconMessageCircle, IconSend, IconX } from '@tabler/icons-react';
import { getStoredToken } from '../../lib/auth';
import {
  FEEDBACK_CATEGORIES,
  submitFeedback,
  type FeedbackCategory,
} from '../../lib/feedbackApi';

function projectIdFromSearch(search: URLSearchParams | null): string | null {
  if (!search) return null;
  return search.get('projectId') || search.get('project_id') || null;
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const projectId = useMemo(() => projectIdFromSearch(searchParams), [searchParams]);

  useEffect(() => {
    setSignedIn(Boolean(getStoredToken()));
  }, [open, pathname]);

  // Hide on public marketing + auth screens.
  if (
    !pathname ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  if (!signedIn) return null;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({
        message: message.trim(),
        category,
        projectId,
        route: pathname,
        pageUrl: typeof window !== 'undefined' ? window.location.href : null,
      });
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send feedback.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="pointer-events-auto w-[min(100vw-2rem,22rem)] rounded-[var(--radius-card,14px)] border border-[var(--border)] bg-[var(--surface,#FFFCF7)] p-4 shadow-[0_18px_50px_rgba(40,32,24,0.18)] dark:bg-[var(--surface-1,#1C1916)]">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[var(--text,#3A342D)] dark:text-[var(--text-primary)]">
                Send feedback
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Bugs, ideas, or billing questions — we read every note.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              aria-label="Close feedback"
            >
              <IconX size={16} />
            </button>
          </div>

          {sent ? (
            <p className="py-6 text-center text-sm text-[var(--coral,#EA8069)]">Thanks — sent.</p>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--coral,#EA8069)]"
                >
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Message
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={8000}
                  required
                  placeholder="What should we know?"
                  className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--coral,#EA8069)]"
                />
              </label>
              {(projectId || pathname) && (
                <p className="truncate text-[10px] text-[var(--text-muted)]">
                  {pathname}
                  {projectId ? ` · project ${projectId.slice(0, 8)}…` : ''}
                </p>
              )}
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={busy || !message.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--coral,#EA8069)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <IconSend size={15} />
                {busy ? 'Sending…' : 'Send'}
              </button>
            </form>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface,#FFFCF7)] px-3.5 py-2.5 text-sm text-[var(--text,#3A342D)] shadow-md transition hover:border-[var(--coral,#EA8069)]/50 dark:bg-[var(--surface-1,#1C1916)] dark:text-[var(--text-primary)]"
        aria-expanded={open}
        aria-label="Send feedback"
      >
        <IconMessageCircle size={18} className="text-[var(--coral,#EA8069)]" />
        <span className="hidden sm:inline">Feedback</span>
      </button>
    </div>
  );
}
