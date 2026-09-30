'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAdminWhoami } from '../lib/feedbackApi';
import { getAuthHeaders, getStoredToken } from '../lib/auth';

type Labeled = { value?: unknown; provenance?: string; note?: string };
type Section = 'economics' | 'users' | 'feedback' | 'health' | 'research' | 'content' | 'audit';
type WindowKey = 'month' | '30d' | 'all';

const NAV: Section[] = ['economics', 'users', 'feedback', 'health', 'research', 'content', 'audit'];

function val(row: unknown): number {
  if (row && typeof row === 'object' && 'value' in row) {
    const n = Number((row as Labeled).value);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(row);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `${n < 0 ? '−' : ''}$${abs.toFixed(digits)}`;
}

function tierLabel(raw: string): string {
  if (raw === 'premium_plus') return 'Premium Plus (VIP)';
  if (raw === 'premium') return 'Premium';
  if (raw === 'free') return 'Free';
  return raw || '—';
}

function sizeLabel(size: string, prompt: number, completion: number): string {
  if (size === 'unknown' && prompt + completion === 0) return '0-token / no LLM call';
  return size;
}

function excBadge(row: unknown) {
  const p = row && typeof row === 'object' ? (row as Labeled).provenance : undefined;
  if (!p || p === 'measured' || p === 'public_price') return null;
  return (
    <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-900" title={(row as Labeled).note || p}>
      {p}
    </span>
  );
}

export default function OpsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('economics');
  const [windowKey, setWindowKey] = useState<WindowKey>('month');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [badges, setBadges] = useState({ feedback: 0, health: false, audit: 0 });
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Record<string, unknown> | null>(null);
  const [runView, setRunView] = useState<Record<string, unknown> | null>(null);
  const [userFilter, setUserFilter] = useState('all');
  const [notes, setNotes] = useState('');
  const [assumptions, setAssumptions] = useState({ freeRuns: 40, prompt: 2000, completion: 800, freeUsers: 100, premium: 5 });

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
    })();
  }, [router]);

  useEffect(() => {
    if (!authed) return;
    void load(section);
    void refreshBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, section, windowKey]);

  async function refreshBadges() {
    const headers = getAuthHeaders();
    const [fb, health, audit] = await Promise.all([
      fetch('/api/ops/feedback?triage=new&limit=100', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/ops/health', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/ops/audit?limit=20', { headers }).then((r) => r.json()).catch(() => ({})),
    ]);
    const delivery = (health.delivery || {}) as { failures?: Labeled };
    const actions = ((audit.actions as Labeled)?.value as unknown[]) || [];
    setBadges({
      feedback: Array.isArray(fb.items) ? fb.items.length : 0,
      health: val(delivery.failures) > 0,
      audit: actions.length,
    });
  }

  async function load(name: Section) {
    setBusy(true);
    setError('');
    const q = name === 'economics' || name === 'research' ? `?window=${windowKey}` : '';
    const res = await fetch(`/api/ops/${name}${q}`, { headers: getAuthHeaders() });
    setBusy(false);
    if (res.status === 401) {
      router.replace('/login?next=/ops');
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
    const res = await fetch(`/api/ops/${path}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof payload.detail === 'string' ? payload.detail : 'Action failed');
      return;
    }
    await load(section);
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Operator console</h1>
        <p className="mt-2 text-sm text-[var(--text-muted,#8A8178)]">{error || 'Checking your sign-in…'}</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 shrink-0 border-r border-[var(--border)] px-3 py-6">
        <p className="px-2 text-xs uppercase tracking-wide text-[var(--text-muted,#8A8178)]">Operator</p>
        <nav className="mt-3 space-y-1">
          {NAV.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSection(name)}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm capitalize ${section === name ? 'bg-[var(--surface-2,#F3EDE4)]' : ''}`}
            >
              {name}
              {name === 'feedback' && badges.feedback > 0 ? <span className="rounded-full bg-[var(--text,#3A342D)] px-1.5 text-[10px] text-white">{badges.feedback}</span> : null}
              {name === 'health' && badges.health ? <span className="h-2 w-2 rounded-full bg-red-600" /> : null}
              {name === 'audit' && badges.audit > 0 ? <span className="text-[10px] text-[var(--text-muted,#8A8178)]">{badges.audit}</span> : null}
            </button>
          ))}
        </nav>
        <a href="/research" className="mt-6 block px-2 text-xs underline">Back to app</a>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold capitalize">{section}</h1>
          <div className="flex gap-1 text-sm">
            {(['month', '30d', 'all'] as WindowKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setWindowKey(key)}
                className={`rounded-full border px-3 py-1 ${windowKey === key ? 'border-[var(--text,#3A342D)]' : 'border-[var(--border)]'}`}
                title={key === 'month' ? 'This UTC month' : key === '30d' ? 'Last 30 days' : 'All time'}
              >
                {key === 'month' ? 'This month' : key === '30d' ? 'Last 30 days' : 'All time'}
              </button>
            ))}
          </div>
        </header>
        {error ? <p className="mb-3 text-sm text-[#9B4D3B]">{error}</p> : null}
        {busy ? <p className="text-sm">Loading…</p> : null}
        {section === 'economics' && data ? (
          <Economics data={data} assumptions={assumptions} setAssumptions={setAssumptions} onImport={(body) => post('cost-imports', body)} />
        ) : null}
        {section === 'users' && data ? (
          <Users
            data={data}
            filter={userFilter}
            setFilter={setUserFilter}
            selected={selectedUser}
            setSelected={setSelectedUser}
            onAction={(id, body) => post(`users/${id}/actions`, body)}
          />
        ) : null}
        {section === 'feedback' && data ? (
          <Feedback
            data={data}
            selected={selectedFeedback}
            setSelected={(item) => { setSelectedFeedback(item); setNotes(String(item?.notes || '')); setRunView(null); }}
            notes={notes}
            setNotes={setNotes}
            runView={runView}
            onStatus={(id, status) => post(`feedback/${id}`, { triage_status: status, notes, confirm: true })}
            onOpenRun={async (id, reveal) => {
              if (reveal && !window.confirm('Reveal full run content? This access is written to the audit log.')) return;
              const res = await fetch(`/api/ops/feedback/${id}/run${reveal ? '?reveal=true' : ''}`, { headers: getAuthHeaders() });
              setRunView(await res.json());
            }}
          />
        ) : null}
        {section === 'health' && data ? <Health data={data} onRefresh={() => load('health')} /> : null}
        {section === 'research' && data ? <Research data={data} /> : null}
        {section === 'content' && data ? <Content data={data} /> : null}
        {section === 'audit' && data ? <Audit data={data} /> : null}
      </main>
    </div>
  );
}

function Economics({
  data,
  assumptions,
  setAssumptions,
  onImport,
}: {
  data: Record<string, unknown>;
  assumptions: { freeRuns: number; prompt: number; completion: number; freeUsers: number; premium: number };
  setAssumptions: (v: { freeRuns: number; prompt: number; completion: number; freeUsers: number; premium: number }) => void;
  onImport: (body: unknown) => void;
}) {
  const vs = (data.foundry_vs_model || {}) as Record<string, Labeled>;
  const funnel = (data.free_funnel || {}) as Record<string, Labeled>;
  const rows = (data.usage_by_tier_and_size || []) as Array<Record<string, unknown>>;
  const modeled = val(vs.modeled_free_user_at_75_cap_usd);
  const measured = val(vs.measured_foundry_per_free_user_usd);
  const delta = modeled ? ((measured - modeled) / modeled) * 100 : 0;
  const n = rows.reduce((s, row) => s + val(row.runs), 0);
  const spend = rows.reduce((s, row) => s + val(row.foundry_usd), 0) || 1;
  const scenarioFoundry = assumptions.freeUsers * assumptions.freeRuns * ((assumptions.prompt * 0.4 + assumptions.completion * 1.6) / 1e6);
  const scenarioNet = assumptions.premium * 19 + assumptions.freeUsers * 0.062 - scenarioFoundry - 35;

  return (
    <div className="max-w-[1400px] space-y-6">
      <section>
        <h2 className="text-sm text-[var(--text-muted,#8A8178)]">Free-tier health</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-muted,#8A8178)]" title="modeled_free_user_at_75_cap_usd">Modeled cost per Free user (at 75-run cap)</p>
            <p className="mt-1 text-3xl tabular-nums">{money(modeled)}</p>
            {excBadge(vs.modeled_free_user_at_75_cap_usd)}
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-muted,#8A8178)]" title="measured_foundry_per_free_user_usd">Measured Foundry per Free user</p>
            <p className="mt-1 text-3xl tabular-nums">{money(measured)}</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">{delta.toFixed(1)}%</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted,#8A8178)]">
          Sample size {n} runs{n < 50 ? ' · low sample, n<50' : ''}. Window: {String(data.window || 'month')}. Token sums use public Foundry list rates.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ['Free users', funnel.free_users],
            ['Active paid', funnel.active_premium_or_vip],
            ['Hit 75-run cap', funnel.hit_75_run_cap],
            ['Ad-extend claims', funnel.ad_extend_claims_this_month],
          ] as Array<[string, Labeled | undefined]>).map(([label, row]) => (
            <div key={String(label)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">
              <div className="text-xs text-[var(--text-muted,#8A8178)]">{label}</div>
              <div className="tabular-nums">{val(row)}{excBadge(row)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-h-[420px] overflow-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--surface,#FFFCF8)] text-left text-xs text-[var(--text-muted,#8A8178)]">
            <tr>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2 text-right" title="Measured LLM runs in this window">Runs</th>
              <th className="px-3 py-2 text-right">Avg prompt</th>
              <th className="px-3 py-2 text-right">Avg completion</th>
              <th className="px-3 py-2 text-right" title="Foundry $ divided by runs">Cost / run</th>
              <th className="px-3 py-2 text-right" title="Sum of tokens × public list rate">Foundry $</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const runs = val(row.runs);
              const cost = val(row.foundry_usd);
              const share = Math.min(100, (cost / spend) * 100);
              return (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{tierLabel(String(row.tier))}</td>
                  <td className="px-3 py-2">{sizeLabel(String(row.model_size), val(row.avg_prompt_tokens), val(row.avg_completion_tokens))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{runs}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{val(row.avg_prompt_tokens).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{val(row.avg_completion_tokens).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{runs ? money(cost / runs) : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="tabular-nums">{money(cost)}{excBadge(row.foundry_usd)}</div>
                    <div className="ml-auto mt-1 h-1 w-24 rounded bg-[var(--surface-2,#F3EDE4)]">
                      <div className="h-1 rounded bg-[var(--text,#3A342D)]" style={{ width: `${share}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section>
        <h2 className="text-sm text-[var(--text-muted,#8A8178)]">Revenue</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {((data.net_per_tier || []) as Array<Record<string, unknown>>).map((row) => (
            <div key={String(row.tier)} className="rounded-xl border border-[var(--border)] p-3 text-sm">
              <div className="font-medium">{tierLabel(String(row.tier))}</div>
              <div>Net {money(val(row.net_usd))}{excBadge(row.net_usd)}</div>
              <div className="text-[var(--text-muted,#8A8178)]">Foundry {money(val(row.foundry_usd))} · Ads {money(val(row.ads_usd))}{excBadge(row.ads_usd)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] p-4 text-sm">
        <h2 className="font-medium" title="README scenario inputs">Model vs measured assumptions</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {([
            ['freeRuns', 'Free runs each'],
            ['prompt', 'Prompt tokens'],
            ['completion', 'Completion tokens'],
            ['freeUsers', 'Free users'],
            ['premium', 'Premium users'],
          ] as const).map(([key, label]) => (
            <label key={key} className="text-xs">
              {label}
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                value={assumptions[key]}
                onChange={(e) => setAssumptions({ ...assumptions, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted,#8A8178)]">
          Live scenario (small model, $19 Premium, $0.062 ads estimate, $35 fixed): Foundry {money(scenarioFoundry)}, net {money(scenarioNet)}. This recomputes in the browser. It does not write the README.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1 text-xs"
          onClick={() => onImport({ period: new Date().toISOString().slice(0, 7), note: 'manual import from console', confirm: true })}
        >
          Save an empty cost-import row for this month
        </button>
      </section>
    </div>
  );
}

function Users({
  data,
  filter,
  setFilter,
  selected,
  setSelected,
  onAction,
}: {
  data: Record<string, unknown>;
  filter: string;
  setFilter: (v: string) => void;
  selected: Record<string, unknown> | null;
  setSelected: (u: Record<string, unknown> | null) => void;
  onAction: (id: string, body: unknown) => void;
}) {
  const users = (data.users as Array<Record<string, unknown>>) || [];
  const filtered = users.filter((user) => {
    if (filter === 'free') return user.tier === 'free';
    if (filter === 'premium') return user.tier === 'premium';
    if (filter === 'vip') return user.tier === 'premium_plus';
    if (filter === 'grace') return user.subscription_state === 'grace';
    if (filter === 'cap') return user.tier === 'free' && Number(user.llm_runs_used) >= 75;
    return true;
  });
  const paid = users.filter((u) => u.tier === 'premium' || u.tier === 'premium_plus').length;
  const grace = users.filter((u) => u.subscription_state === 'grace').length;
  return (
    <div className="max-w-[1400px]">
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <span>Total {users.length}</span>
        <span>Paid {paid}</span>
        <span>In grace {grace}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {['all', 'free', 'premium', 'vip', 'grace', 'cap'].map((chip) => (
          <button key={chip} type="button" onClick={() => setFilter(chip)} className={`rounded-full border px-2 py-1 ${filter === chip ? 'border-[var(--text,#3A342D)]' : 'border-[var(--border)]'}`}>
            {chip === 'cap' ? 'Near cap' : chip}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[var(--text-muted,#8A8178)]">
          <tr>
            <th className="px-2 py-2">Email</th>
            <th className="px-2 py-2">Tier</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2 text-right">Runs</th>
            <th className="px-2 py-2 text-right">Tokens</th>
            <th className="px-2 py-2">Last active</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((user) => {
            const used = Number(user.llm_runs_used) || 0;
            const limit = user.tier === 'free' ? 75 : 0;
            const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
            return (
              <tr key={String(user.id)} className="cursor-pointer border-t border-[var(--border)]" onClick={() => setSelected(user)}>
                <td className="px-2 py-2">{String(user.email || '')}</td>
                <td className="px-2 py-2">{tierLabel(String(user.tier))}</td>
                <td className="px-2 py-2">{String(user.subscription_state)}</td>
                <td className="px-2 py-2 text-right">
                  <div className="tabular-nums">{used}{limit ? ` / ${limit}` : ''}</div>
                  {limit ? <div className="ml-auto h-1 w-16 rounded bg-[var(--surface-2,#F3EDE4)]"><div className="h-1 rounded bg-[var(--text,#3A342D)]" style={{ width: `${pct}%` }} /></div> : null}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{String(user.usage_tokens_used)}</td>
                <td className="px-2 py-2">{user.last_active ? String(user.last_active).slice(0, 10) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selected ? (
        <aside className="fixed inset-y-0 right-0 w-full max-w-md overflow-auto border-l border-[var(--border)] bg-[var(--surface,#FFFCF8)] p-5 shadow-xl">
          <button type="button" className="text-sm underline" onClick={() => setSelected(null)}>Close</button>
          <h2 className="mt-3 text-lg">{String(selected.email)}</h2>
          <p className="text-sm text-[var(--text-muted,#8A8178)]">{tierLabel(String(selected.tier))} · {String(selected.subscription_state)}</p>
          <p className="mt-2 text-sm">Runs {String(selected.llm_runs_used)} · tokens {String(selected.usage_tokens_used)}</p>
          <div className="mt-6 space-y-2 border-t border-red-200 pt-4">
            <p className="text-xs uppercase text-red-800">Account actions</p>
            <button type="button" className="block text-sm underline" onClick={() => onAction(String(selected.id), { action: 'grant_tier', tier: 'premium', confirm: true })}>Grant Premium</button>
            <button type="button" className="block text-sm underline" onClick={() => onAction(String(selected.id), { action: 'reset_monthly_counter', confirm: true })}>Reset monthly counter</button>
            <button type="button" className="block text-sm underline" onClick={() => onAction(String(selected.id), { action: 'extend_grace', grace_days: 7, confirm: true })}>Extend grace 7 days</button>
            <button type="button" className="block text-sm text-red-800 underline" onClick={() => onAction(String(selected.id), { action: 'suspend', confirm: true })}>Suspend</button>
            <button type="button" className="block text-sm text-red-800 underline" onClick={() => onAction(String(selected.id), { action: 'revoke_tier', confirm: true })}>Revoke tier</button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function Feedback({
  data,
  selected,
  setSelected,
  notes,
  setNotes,
  runView,
  onStatus,
  onOpenRun,
}: {
  data: Record<string, unknown>;
  selected: Record<string, unknown> | null;
  setSelected: (item: Record<string, unknown> | null) => void;
  notes: string;
  setNotes: (v: string) => void;
  runView: Record<string, unknown> | null;
  onStatus: (id: string, status: string) => void;
  onOpenRun: (id: string, reveal: boolean) => void;
}) {
  const items = (data.items as Array<Record<string, unknown>>) || [];
  return (
    <div className="grid max-w-[1400px] gap-4 lg:grid-cols-[320px_1fr]">
      <div className="max-h-[70vh] space-y-1 overflow-auto">
        {items.map((item) => (
          <button
            key={String(item.id)}
            type="button"
            onClick={() => setSelected(item)}
            className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${item.category === 'billing' ? 'border-amber-400' : 'border-[var(--border)]'} ${selected?.id === item.id ? 'bg-[var(--surface-2,#F3EDE4)]' : ''}`}
          >
            <div className="flex gap-2 text-xs text-[var(--text-muted,#8A8178)]">
              {item.triage_status === 'new' ? <span className="h-2 w-2 rounded-full bg-[var(--text,#3A342D)]" /> : null}
              <span>{tierLabel(String((item.tier_now as Labeled)?.value || ''))}</span>
              <span>{String(item.category)}</span>
              {item.run_id ? <span>run</span> : null}
            </div>
            <p className="mt-1 line-clamp-2">{String(item.preview)}</p>
          </button>
        ))}
      </div>
      <div>
        {selected ? (
          <div className="space-y-3 text-sm">
            <p>{String(selected.preview)}</p>
            <p className="text-xs text-[var(--text-muted,#8A8178)]">{String(selected.route || '')} · {String(selected.created_at || '').slice(0, 16)}</p>
            <label className="block text-xs">
              Internal notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-20 w-full rounded-lg border border-[var(--border)] bg-transparent p-2" />
            </label>
            <div className="flex flex-wrap gap-2">
              {['new', 'triaged', 'resolved', 'wont_fix'].map((status) => (
                <button key={status} type="button" className="rounded-full border border-[var(--border)] px-2 py-1 text-xs" onClick={() => onStatus(String(selected.id), status)}>{status}</button>
              ))}
            </div>
            {selected.run_id ? (
              <div className="flex gap-3 text-xs">
                <button type="button" className="underline" onClick={() => onOpenRun(String(selected.id), false)}>Run summary</button>
                <button type="button" className="underline" onClick={() => onOpenRun(String(selected.id), true)}>Open full run</button>
              </div>
            ) : <p className="text-xs">No run linked.</p>}
            {runView ? <pre className="max-h-80 overflow-auto rounded-lg border border-[var(--border)] p-3 text-xs">{JSON.stringify(runView, null, 2)}</pre> : null}
          </div>
        ) : <p className="text-sm text-[var(--text-muted,#8A8178)]">Select a note.</p>}
      </div>
    </div>
  );
}

function Health({ data, onRefresh }: { data: Record<string, unknown>; onRefresh: () => void }) {
  const services = (data.services || {}) as Record<string, Labeled>;
  const delivery = (data.delivery || {}) as Record<string, Labeled>;
  const crons = (data.crons || {}) as Record<string, Labeled>;
  return (
    <div className="max-w-[1400px] space-y-4">
      <button type="button" className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm" onClick={onRefresh}>Run checks now</button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(services).map(([name, row]) => {
          const text = String(row?.value ?? '');
          const down = text.startsWith('down') || text.includes('auth failed') || text.includes('unreachable');
          const asleep = name === 'backend_b' && text.startsWith('asleep');
          return (
            <div key={name} className="rounded-xl border border-[var(--border)] p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${down ? 'bg-red-600' : asleep ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                <span className="font-medium">{name.replaceAll('_', ' ')}</span>
              </div>
              <p className="mt-2 text-xs">{text}{excBadge(row)}</p>
              {row?.note ? <p className="mt-1 text-xs text-[var(--text-muted,#8A8178)]">{row.note}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="text-sm">Delivery failures {val(delivery.failures)} · queue {val(delivery.queue_depth)}</p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[var(--text-muted,#8A8178)]"><tr><th className="px-2 py-2">Cron</th><th className="px-2 py-2">Last signal</th></tr></thead>
        <tbody>
          {Object.entries(crons).map(([name, row]) => (
            <tr key={name} className="border-t border-[var(--border)]"><td className="px-2 py-2">{name}</td><td className="px-2 py-2">{String(row?.value ?? '—')}{excBadge(row)}</td></tr>
          ))}
          <tr className="border-t border-[var(--border)]"><td className="px-2 py-2">Source-id drift (91 expected)</td><td className="px-2 py-2">not polled{excBadge((data.source_id_sync as Labeled))}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function Research({ data }: { data: Record<string, unknown> }) {
  const runs = (data.runs as Array<Record<string, unknown>>) || [];
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  const rate = val(data.zero_token_hit_rate);
  return (
    <div className="max-w-[1400px] space-y-3">
      <p className="text-sm">0-token hit rate {(rate * 100).toFixed(1)}%</p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[var(--text-muted,#8A8178)]">
          <tr>
            <th className="px-2 py-2">Time</th>
            <th className="px-2 py-2">Route</th>
            <th className="px-2 py-2">Preview</th>
            <th className="px-2 py-2 text-right">Tokens</th>
            <th className="px-2 py-2">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={String(run.id)} className="cursor-pointer border-t border-[var(--border)]" onClick={async () => {
              const res = await fetch(`/api/ops/research/runs/${run.id}`, { headers: getAuthHeaders() });
              setOpen(await res.json());
            }}>
              <td className="px-2 py-2">{String(run.created_at || '').slice(0, 16)}</td>
              <td className="px-2 py-2">{String(run.route)}</td>
              <td className="px-2 py-2">{String(run.preview || '—')}</td>
              <td className="px-2 py-2 text-right tabular-nums">{String(run.total_tokens)}</td>
              <td className="px-2 py-2">{String(run.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open ? (
        <ol className="space-y-2 text-xs">
          {((open.events as Array<Record<string, unknown>>) || []).map((event, i) => (
            <li key={i} className="rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="font-medium">{String(event.event)}</span>
              <pre className="mt-1 overflow-auto">{JSON.stringify(event.payload)}</pre>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function Content({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid max-w-[1400px] gap-3 sm:grid-cols-3">
      {['artifact_docs', 'analysis_memory_docs', 'connectors'].map((key) => {
        const row = data[key] as Labeled | undefined;
        return (
          <div key={key} className="rounded-xl border border-[var(--border)] p-4 text-sm">
            <h2 className="font-medium">{key === 'artifact_docs' ? 'Artifacts' : key === 'analysis_memory_docs' ? 'Memory' : 'Connectors'}</h2>
            <p className="mt-2 text-2xl tabular-nums">{row?.value == null ? '—' : String(row.value)}{excBadge(row)}</p>
            {row?.note ? <p className="mt-1 text-xs text-[var(--text-muted,#8A8178)]">{row.note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function Audit({ data }: { data: Record<string, unknown> }) {
  const rows = ((data.actions as Labeled)?.value as Array<Record<string, unknown>>) || [];
  function color(action: string) {
    if (action.includes('viewed_run') || action.includes('reveal')) return 'text-amber-800';
    if (action.includes('tier') || action.includes('grant') || action.includes('revoke')) return 'text-red-800';
    return '';
  }
  return (
    <div className="max-w-[1400px]">
      <button
        type="button"
        className="mb-3 text-xs underline"
        onClick={() => {
          const header = 'time,actor,action,target\n';
          const body = rows.map((row) => [row.created_at, row.actor, row.action, row.target].join(',')).join('\n');
          const blob = new Blob([header + body], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'admin-audit.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export CSV
      </button>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[var(--text-muted,#8A8178)]">
          <tr><th className="px-2 py-2">Time</th><th className="px-2 py-2">Actor</th><th className="px-2 py-2">Action</th><th className="px-2 py-2">Target</th></tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              <td className="px-2 py-2">{String(row.created_at || '').slice(0, 19)}</td>
              <td className="px-2 py-2">{String(row.actor || '')}</td>
              <td className={`px-2 py-2 ${color(String(row.action || ''))}`}>{String(row.action || '')}</td>
              <td className="px-2 py-2">{String(row.target || '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
