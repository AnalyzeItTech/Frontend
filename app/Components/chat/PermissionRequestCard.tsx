'use client';

import React from 'react';
import Link from 'next/link';

export type PermissionDecision = 'allow' | 'deny' | null;

/**
 * One-time prompt: may the assistant read this project's data? The answer is remembered for the project
 * and can be changed any time under Connectors → AI data access.
 */
export function PermissionRequestCard({
  projectId,
  decision,
  busy,
  error,
  onAllow,
  onDeny,
}: {
  projectId: string;
  decision: PermissionDecision;
  busy: boolean;
  error?: string | null;
  onAllow: () => void;
  onDeny: () => void;
}) {
  const settings = `/connectors?project=${encodeURIComponent(projectId)}#ai-access`;
  return (
    <div role="group" aria-label="Data access request" className="mt-3 rounded-xl border border-[var(--coral,#E3836C)]/40 bg-[var(--coral,#E3836C)]/5 p-3">
      <p className="text-sm font-medium text-[var(--text-primary)]">Allow the assistant to read the data in this project?</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        This covers your custom objects and data synced from connectors. Credentials are never shared with the AI. Changes the assistant
        proposes always need your approval first. We&apos;ll remember your choice for this project.
      </p>
      {decision ? (
        <p role="status" className="mt-2 text-xs text-[var(--text-primary)]">
          {decision === 'allow' ? 'Allowed. Continuing…' : 'Not allowed. The assistant won’t read this project’s data.'}{' '}
          <Link href={settings} className="underline underline-offset-2">Change in settings</Link>
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={onAllow} className="btn-primary text-xs disabled:opacity-50">
            {busy ? 'Saving…' : 'Allow and continue'}
          </button>
          <button type="button" disabled={busy} onClick={onDeny} className="btn-secondary text-xs disabled:opacity-50">
            Don&apos;t allow
          </button>
          <Link href={settings} className="text-xs text-[var(--text-muted)] underline underline-offset-2">Choose per object</Link>
        </div>
      )}
      {error ? <p role="alert" className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
