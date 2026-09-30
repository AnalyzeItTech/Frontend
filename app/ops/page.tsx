'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAdminWhoami } from '../lib/feedbackApi';
import { getAuthHeaders, getStoredToken } from '../lib/auth';

type Labeled = { value: unknown; provenance?: string; note?: string };

function Badge({ provenance }: { provenance?: string }) {
  const label = provenance || 'unknown';
  return (
    <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted,#8A8178)]">
      {label}
    </span>
  );
}

function Cell({ row }: { row?: Labeled | null }) {
  if (!row) return <span>—</span>;
  const value = typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value ?? '—');
  return (
    <span>
      {value}
      <Badge provenance={row.provenance} />
      {row.note ? <span className="mt-1 block text-xs text-[var(--text-muted,#8A8178)]">{row.note}</span> : null}
    </span>
  );
}

const SECTIONS = ['economics', 'users', 'feedback', 'health', 'research', 'content', 'audit'] as const;

export default function OpsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('economics');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [importJson, setImportJson] = useState('{"period":"2026-09","render_usd":0,"vercel_usd":0,"adsense_usd":0,"rewarded_ads_usd":0,"azure_cost_management_usd":0,"note":"","confirm":true}');
  const [billingOnly, setBillingOnly] = useState(false);
  const [runView, setRunView] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?next=/ops');
      return;
    }
    void (async () => {
      const who = await fetchAdminWhoami();
      if (!who.is_admin) {
        setError('This account is not on the admin allowlist (ADMIN_EMAILS on Backend A).');
        return;
      }
      setAuthed(true);
      await load('economics');
    })();
    // load is recreated each render; the gate should run once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load(name: (typeof SECTIONS)[number]) {
    setSection(name);
    setBusy(true);
    setError('');
    const qs = name === 'feedback' && billingOnly ? '?billing_only=true' : '';
    const res = await fetch(`/api/ops/${name}${qs}`, { headers: getAuthHeaders() });
    setBusy(false);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.detail || 'Request failed');
      return;
    }
    setData(body);
  }

  async function post(path: string, body: unknown) {
    if (!window.confirm('Apply this operator action? It is written to the audit log.')) return;
    setBusy(true);
    const res = await fetch(`/api/ops/${path}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.detail || 'Action failed');
      return;
    }
    await load(section);
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Operator console</h1>
        <p className="mt-2 text-sm text-[var(--text-muted,#8A8178)]">
          {error || 'Checking your sign-in…'}
        </p>
      </main>
    );
  }

  const econ = data as {
    usage_by_tier_and_size?: Array<Record<string, Labeled | string>>;
    foundry_vs_model?: Record<string, Labeled>;
    free_funnel?: Record<string, Labeled>;
    net_per_tier?: Array<Record<string, Labeled | string>>;
    users?: Array<Record<string, unknown>>;
    payments?: Array<Record<string, unknown>>;
    failed_renewals?: Array<Record<string, unknown>>;
  } | null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Operator console</h1>
        <a href="/research" className="text-sm underline">Back to app</a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => load(name)}
            className={`rounded-full border px-3 py-1 text-sm ${section === name ? 'border-[var(--text,#3A342D)]' : 'border-[var(--border)]'}`}
          >
            {name}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-[#9B4D3B]">{error}</p> : null}
      {busy ? <p className="mt-4 text-sm">Loading…</p> : null}

      {section === 'economics' && econ?.usage_by_tier_and_size ? (
        <section className="mt-6 space-y-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[var(--text-muted,#8A8178)]">
                <th>Tier</th><th>Size</th><th>Runs</th><th>Avg prompt</th><th>Avg completion</th><th>Foundry $</th>
              </tr>
            </thead>
            <tbody>
              {econ.usage_by_tier_and_size.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="py-2">{String(row.tier)}</td>
                  <td>{String(row.model_size)}</td>
                  <td><Cell row={row.runs as Labeled} /></td>
                  <td><Cell row={row.avg_prompt_tokens as Labeled} /></td>
                  <td><Cell row={row.avg_completion_tokens as Labeled} /></td>
                  <td><Cell row={row.foundry_usd as Labeled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(econ.foundry_vs_model || {}).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <div className="text-[var(--text-muted,#8A8178)]">{k}</div>
                <Cell row={v} />
              </div>
            ))}
            {Object.entries(econ.free_funnel || {}).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <div className="text-[var(--text-muted,#8A8178)]">{k}</div>
                <Cell row={v} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {(econ.net_per_tier || []).map((row) => (
              <div key={String(row.tier)} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                <strong>{String(row.tier)}</strong>
                <div>Net <Cell row={row.net_usd as Labeled} /></div>
                <div>Foundry <Cell row={row.foundry_usd as Labeled} /></div>
                <div>Ads <Cell row={row.ads_usd as Labeled} /></div>
              </div>
            ))}
          </div>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              post('cost-imports', JSON.parse(importJson));
            }}
          >
            <label className="block text-sm">Cost import JSON (Azure, Render, Vercel, AdSense, rewarded)</label>
            <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} className="h-28 w-full rounded-xl border border-[var(--border)] bg-transparent p-2 font-mono text-xs" />
            <button type="submit" className="rounded-xl border border-[var(--border)] px-3 py-1 text-sm">Save import</button>
          </form>
        </section>
      ) : null}

      {section === 'users' && econ?.users ? (
        <section className="mt-6 space-y-4 text-sm">
          {econ.users.map((user) => (
            <div key={String(user.id)} className="rounded-xl border border-[var(--border)] p-3">
              <div>{String(user.email)} · {String(user.tier)} · {String(user.subscription_state)}</div>
              <div className="text-[var(--text-muted,#8A8178)]">
                runs {String(user.llm_runs_used)} · tokens {String(user.usage_tokens_used)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => post(`users/${user.id}/actions`, { action: 'reset_monthly_counter', confirm: true })}>Reset counter</button>
                <button type="button" onClick={() => post(`users/${user.id}/actions`, { action: 'extend_grace', grace_days: 7, confirm: true })}>Extend grace 7d</button>
                <button type="button" onClick={() => post(`users/${user.id}/actions`, { action: 'suspend', confirm: true })}>Suspend</button>
                <button type="button" onClick={() => post(`users/${user.id}/actions`, { action: 'revoke_tier', confirm: true })}>Revoke tier</button>
              </div>
            </div>
          ))}
          <h2 className="pt-4 font-medium">Failed renewals</h2>
          <pre className="overflow-auto text-xs">{JSON.stringify(econ.failed_renewals || [], null, 2)}</pre>
          <h2 className="font-medium">Payments</h2>
          <pre className="overflow-auto text-xs">{JSON.stringify(econ.payments || [], null, 2)}</pre>
        </section>
      ) : null}

      {section === 'feedback' && data ? (
        <section className="mt-6 space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={billingOnly} onChange={(e) => { setBillingOnly(e.target.checked); }} />
            Billing only
          </label>
          <button type="button" className="text-xs underline" onClick={() => load('feedback')}>Apply filter</button>
          {((data.items as Array<Record<string, unknown>>) || []).map((item) => (
            <article key={String(item.id)} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted,#8A8178)]">
                <span>{String(item.category)}</span>
                <span>{String(item.triage_status)}</span>
                <span>{String(item.route || '—')}</span>
                <span>tier {String((item.tier_now as Labeled)?.value ?? '')}</span>
                {item.run_id ? <span>run {String(item.run_id)}</span> : <span>no run</span>}
              </div>
              <p className="mt-2">{String(item.preview)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['new', 'triaged', 'resolved', 'wont_fix'] as const).map((status) => (
                  <button key={status} type="button" onClick={() => post(`feedback/${item.id}`, { triage_status: status, confirm: true })}>{status}</button>
                ))}
                {item.run_id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/ops/feedback/${item.id}/run`, { headers: getAuthHeaders() });
                      setRunView(await res.json());
                    }}
                  >
                    Open run preview
                  </button>
                ) : null}
                {item.run_id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Reveal full run content? This access is written to the audit log.')) return;
                      const res = await fetch(`/api/ops/feedback/${item.id}/run?reveal=true`, { headers: getAuthHeaders() });
                      setRunView(await res.json());
                    }}
                  >
                    Reveal full run
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {runView ? <pre className="overflow-auto rounded-xl border border-[var(--border)] p-3 text-xs">{JSON.stringify(runView, null, 2)}</pre> : null}
        </section>
      ) : null}

      {section !== 'economics' && section !== 'users' && section !== 'feedback' && data ? (
        <pre className="mt-6 overflow-auto rounded-xl border border-[var(--border)] p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
      ) : null}
    </main>
  );
}
