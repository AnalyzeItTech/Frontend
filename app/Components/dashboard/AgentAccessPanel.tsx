'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getAgentAccess, setAgentAccess, type AccessLevel, type AgentAccess } from '../../lib/agentAccessApi';
import { useToast } from '../ui/Toast';

const DEFAULT_LABEL: Record<AccessLevel, string> = {
  ask: 'Ask me the first time',
  allow: 'Allow the assistant to read',
  deny: 'Don’t allow',
};

/**
 * Settings for what the AI may read in this project. One project-wide default (remembered after the first prompt)
 * plus an optional override per object. Writes are never covered by this: they always need approval.
 */
export function AgentAccessPanel({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [data, setData] = useState<AgentAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getAgentAccess(projectId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load AI data access');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (update: Parameters<typeof setAgentAccess>[1]) => {
    setSaving(true);
    try {
      setData(await setAgentAccess(projectId, update));
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="ai-access" aria-labelledby="ai-access-title" className="rounded-2xl border border-[var(--border)] p-4 mb-6">
      <h3 id="ai-access-title" className="font-semibold text-[var(--text-primary)] text-base">AI data access</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Controls whether the assistant may read this project&apos;s objects and connected data when you chat. Credentials are never shared with it, and
        anything it wants to change is shown for your approval first.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>
      ) : !data ? (
        <p role="status" className="mt-3 text-xs text-[var(--text-muted)]">Loading…</p>
      ) : (
        <>
          <div className="mt-3">
            <label htmlFor="ai-access-default" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">For this project</label>
            <select
              id="ai-access-default"
              disabled={saving}
              value={data.default}
              onChange={(e) => void save({ default: e.target.value as AccessLevel })}
              className="px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              {(Object.keys(DEFAULT_LABEL) as AccessLevel[]).map((k) => (
                <option key={k} value={k}>{DEFAULT_LABEL[k]}</option>
              ))}
            </select>
          </div>

          {data.objects.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1">Per object</h4>
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {data.objects.map((o) => (
                  <li key={o.api_name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{o.label}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {o.source.startsWith('connector:') ? `Synced from ${o.source.slice(10)}` : 'Your object'} · currently{' '}
                        <strong className="font-medium">{o.access === 'ask' ? 'asks first' : o.access === 'allow' ? 'readable' : 'blocked'}</strong>
                      </p>
                    </div>
                    <label className="sr-only" htmlFor={`ai-access-${o.api_name}`}>Access for {o.label}</label>
                    <select
                      id={`ai-access-${o.api_name}`}
                      disabled={saving}
                      value={o.override ?? 'inherit'}
                      onChange={(e) => void save({ overrides: { [o.api_name]: e.target.value === 'inherit' ? null : (e.target.value as 'allow' | 'deny') } })}
                      className="px-2 py-1.5 text-xs rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
                    >
                      <option value="inherit">Use project setting</option>
                      <option value="allow">Always allow</option>
                      <option value="deny">Never allow</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
