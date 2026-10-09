'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { deliveryLine, digestStatusLine, runNowMessage } from '../../lib/digestView.mjs';
import { getDigestSettings, listDigests, runDigestNow, saveDigestSettings, type DigestListItem, type DigestSettings } from '../../lib/digestApi';

/** A weekly check of this project's data, kept here and optionally sent by email or Slack. */
export function DigestPanel({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<DigestSettings | null>(null);
  const [digests, setDigests] = useState<DigestListItem[]>([]);
  const [hook, setHook] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([getDigestSettings(projectId), listDigests(projectId)]);
      setSettings(s);
      setDigests(d);
    } catch {
      setSettings(null);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!settings) return null;

  const save = async (patch: Partial<{ enabled: boolean; email: boolean; slack_webhook: string | null }>) => {
    setBusy(true);
    setMessage('');
    try {
      const next = await saveDigestSettings(projectId, { enabled: settings.enabled, email: settings.email, ...patch });
      setSettings(next);
      if (patch.slack_webhook !== undefined) setHook('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await runDigestNow(projectId);
      setMessage(runNowMessage(res));
      await load();
    } catch (err) {
      setMessage(runNowMessage(null, { status: (err as { status?: number }).status, message: err instanceof Error ? err.message : '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Weekly digest" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Weekly digest</h3>
          <p className="text-xs text-[var(--text-muted)]" role="status">
            {digestStatusLine(settings)}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.enabled} disabled={busy} onChange={(e) => void save({ enabled: e.target.checked })} />
          On
        </label>
      </div>

      {!settings.ai_access_allowed ? (
        <p className="text-xs text-[var(--text-muted)]">The digest reads this project&apos;s data the way the assistant does, so it needs the assistant to be allowed to. Choose Allow under AI data access, above.</p>
      ) : null}

      {settings.enabled ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.email} disabled={busy} onChange={(e) => void save({ email: e.target.checked })} />
            Also email it to me
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder={settings.slack ? 'Slack webhook saved. Paste a new one to replace it' : 'Slack incoming webhook (optional)'}
              autoComplete="off"
              aria-label="Slack incoming webhook"
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
            />
            <button type="button" disabled={busy || !hook.trim()} onClick={() => void save({ slack_webhook: hook.trim() })} className="btn-secondary text-xs disabled:opacity-50">
              Save Slack
            </button>
            {settings.slack ? (
              <button type="button" disabled={busy} onClick={() => void save({ slack_webhook: '' })} className="btn-secondary text-xs disabled:opacity-50">
                Remove Slack
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void runNow()} className="btn-primary text-xs disabled:opacity-50">
          {busy ? 'Working…' : 'Make one now'}
        </button>
        {message ? (
          <span role="status" className="text-xs text-[var(--text-muted)]">
            {message}
          </span>
        ) : null}
      </div>

      {digests.length ? (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {digests.map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <Link href={`/digest/${d.id}`} className="text-[var(--finding-accent)] underline underline-offset-2">
                {d.title}
              </Link>
              <span className="text-xs text-[var(--text-muted)]">
                {d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''} · {deliveryLine(d.delivery)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
