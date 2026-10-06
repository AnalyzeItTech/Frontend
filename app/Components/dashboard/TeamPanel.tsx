'use client';

import { useCallback, useEffect, useState } from 'react';
import { inviteErrorMessage, memberLine, VIEWER_CAN, VIEWER_CANNOT } from '../../lib/teamView.mjs';
import { inviteMember, listMembers, removeMember, type Member } from '../../lib/teamApi';

/** Invite teammates to view this project. They can look, not change. */
export function TeamPanel({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [max, setMax] = useState(10);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fresh, setFresh] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await listMembers(projectId);
      setMembers(d.members);
      setMax(d.max);
    } catch {
      setMembers([]);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    setBusy(true);
    setMessage('');
    setFresh('');
    try {
      const out = await inviteMember(projectId, email.trim());
      setEmail('');
      setFresh(out.link);
      setMessage(`Invited ${out.member.email}. We queued an e-mail with the link. You can also send it yourself:`);
      await load();
    } catch (err) {
      setMessage(inviteErrorMessage(err as { status?: number; message?: string }));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      /* the link is visible, so it can be copied by hand */
    }
  };

  return (
    <section aria-label="Team" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Team</h3>
        <p className="text-xs text-[var(--text-muted)]">Invite people to view this project. Up to {max}.</p>
      </div>
      <div className="grid gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-2">
        <ul className="list-disc space-y-0.5 pl-4">
          {VIEWER_CAN.map((t: string) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <ul className="list-disc space-y-0.5 pl-4">
          {VIEWER_CANNOT.map((t: string) => (
            <li key={t}>Cannot: {t.toLowerCase()}</li>
          ))}
        </ul>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) void invite();
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          aria-label="Teammate e-mail"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !email.trim()} className="btn-primary text-xs disabled:opacity-50">
          Invite
        </button>
      </form>
      {message ? (
        <p role="status" className="text-xs text-[var(--text-muted)]">
          {message}
        </p>
      ) : null}
      {fresh ? <input readOnly value={fresh} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs" /> : null}
      {members.length ? (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{memberLine(m)}</span>
              <span className="flex gap-2">
                {m.link ? (
                  <button type="button" className="btn-secondary text-xs" onClick={() => void copy(m.link as string)}>
                    {copied === m.link ? 'Copied' : 'Copy link'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => void removeMember(projectId, m.id).then(load)}
                >
                  {m.status === 'active' ? 'Remove' : 'Withdraw'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
