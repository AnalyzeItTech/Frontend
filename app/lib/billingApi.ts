import { getAuthHeaders, getStoredToken } from './auth';
import { parseApiFailure } from './apiErrors';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || !getStoredToken()) {
    return 'Sign in to manage billing.';
  }
  return parseApiFailure(res.status, body).message || fallback;
}

export async function getBillingTiers() {
  const res = await fetch(`${API_V1}/billing/tiers`);
  if (!res.ok) throw new Error(await readError(res, 'Could not load plans'));
  return res.json() as Promise<{ tiers: Record<string, Record<string, unknown>> }>;
}

export async function getEntitlements() {
  const res = await fetch(`${API_V1}/billing/entitlements`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Could not load entitlements'));
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getBillingHistory() {
  const res = await fetch(`${API_V1}/billing/history`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Could not load billing history'));
  return res.json() as Promise<{
    events: Array<{ txnid: string; event: string; status: string; applied: string; created_at: string }>;
  }>;
}

export type CheckoutSession = {
  txnid: string;
  plan: string;
  sandbox?: boolean;
  amount: number;
  amount_usd?: number;
  currency?: string;
  country?: string | null;
  payu_url?: string;
  payu_fields?: Record<string, string> | null;
};

export type BillingQuote = {
  country?: string | null;
  plans: {
    premium: { amount: number; amount_usd: number; currency: string; amount_display: string };
    premium_plus: { amount: number; amount_usd: number; currency: string; amount_display: string };
  };
};

export function detectBillingCountry(): string {
  const lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
  const region = lang.split('-')[1];
  return (region || 'US').toUpperCase();
}

export async function getBillingQuote(country: string): Promise<BillingQuote> {
  const res = await fetch(`${API_V1}/billing/quote?country=${encodeURIComponent(country)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not load prices'));
  const data = (await res.json()) as BillingQuote;
  for (const key of ['premium', 'premium_plus'] as const) {
    const row = data?.plans?.[key];
    if (!row) continue;
    const n = coerceMoney(row.amount);
    if (n != null) row.amount = n;
    const usd = coerceMoney(row.amount_usd);
    if (usd != null) row.amount_usd = usd;
  }
  return data;
}

export async function startCheckout(
  plan: 'premium' | 'premium_plus',
  country?: string,
): Promise<CheckoutSession> {
  const res = await fetch(`${API_V1}/billing/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan, country: country || detectBillingCountry() }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Checkout failed'));
  const session = (await res.json()) as CheckoutSession;
  const n = coerceMoney(session.amount);
  if (n != null) session.amount = n;
  return session;
}

export async function completeSandboxCheckout(txnid: string, plan: string) {
  const res = await fetch(`${API_V1}/billing/sandbox-complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ txnid, plan }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not complete payment'));
  return res.json();
}

export async function cancelSubscription() {
  const res = await fetch(`${API_V1}/billing/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not cancel'));
  return res.json();
}

export async function getCheckoutStatus(txnid: string) {
  const res = await fetch(`${API_V1}/billing/checkout/${encodeURIComponent(txnid)}/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not load checkout status'));
  return res.json() as Promise<{ txnid: string; plan?: string; status?: string; paid: boolean }>;
}

const PAYU_REQUIRED = [
  'key',
  'txnid',
  'amount',
  'productinfo',
  'firstname',
  'email',
  'surl',
  'furl',
  'hash',
] as const;


export function coerceMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function isValidMoney(value: unknown): value is number {
  return coerceMoney(value) !== null;
}

export function formatMoney(amount: unknown, currency: string, fallback = '—'): string {
  const n = coerceMoney(amount);
  if (n == null) return fallback;
  const code = (currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n);
  } catch {
    return `${n.toFixed(2)} ${code}`;
  }
}

/** Coerce PayU hosted fields and refuse submit if amount/txnid would become NaN/blank. */
export function normalizePayuFields(fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, raw] of Object.entries(fields)) {
    if (raw === null || raw === undefined) continue;
    out[name] = String(raw).trim();
  }

  // Amount must match the hashed PayU string exactly. Do not re-format via
  // Number/toFixed (4775.69 can become 4775.68 and PayU shows Total Payable NaN).
  const amountRaw = String(out.amount ?? '').trim();
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(amountRaw) || Number(amountRaw) <= 0) {
    throw new Error(
      `PayU amount is invalid (${JSON.stringify(fields.amount)}). Refusing to open checkout.`,
    );
  }
  out.amount = amountRaw;
  delete out.currency;

  if (!out.txnid || out.txnid.length > 25) {
    throw new Error(
      `PayU txnid is missing or longer than 25 chars (${JSON.stringify(out.txnid)}). Refusing checkout.`,
    );
  }

  for (const key of PAYU_REQUIRED) {
    if (!out[key]) {
      throw new Error(`PayU checkout missing required field: ${key}`);
    }
  }

  return out;
}

export function submitPayuForm(payuUrl: string, fields: Record<string, string>) {
  if (!payuUrl) {
    throw new Error('PayU checkout URL is missing');
  }
  const safe = normalizePayuFields(fields);
  // PayU hosted checkout is INR-only; a `currency` field yields Total Payable NaN.
  delete safe.currency;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payuUrl;
  form.acceptCharset = 'UTF-8';
  form.enctype = 'application/x-www-form-urlencoded';
  form.style.display = 'none';
  const payuOrder = [
    'key',
    'txnid',
    'amount',
    'productinfo',
    'firstname',
    'email',
    'phone',
    'surl',
    'furl',
    'hash',
    'service_provider',
  ];
  const posted = new Set<string>();
  const append = (name: string, value: string) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
    posted.add(name);
  };
  for (const name of payuOrder) {
    if (safe[name]) append(name, safe[name]);
  }
  Object.entries(safe).forEach(([name, value]) => {
    if (posted.has(name)) return;
    if (name === 'currency' || name.startsWith('udf')) return;
    append(name, value);
  });
  document.body.appendChild(form);
  form.submit();
}

export async function listNamedLayouts(projectId: string) {
  const res = await fetch(`${API_V1}/projects/${projectId}/layouts`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Could not list layouts'));
  return res.json() as Promise<Array<{ id: string; name: string; version: number; layout_json: { widgets?: unknown[] } }>>;
}

export async function createNamedLayout(projectId: string, name: string, layoutJson: Record<string, unknown>) {
  const res = await fetch(`${API_V1}/projects/${projectId}/layouts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, layout_json: layoutJson }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Could not save layout'));
  return res.json();
}
