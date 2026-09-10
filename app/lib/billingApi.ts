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
  payu_url?: string;
  payu_fields?: Record<string, string> | null;
};

export async function startCheckout(plan: 'premium' | 'premium_plus'): Promise<CheckoutSession> {
  const res = await fetch(`${API_V1}/billing/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Checkout failed'));
  return res.json();
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

/** Coerce PayU hosted fields and refuse submit if amount/txnid would become NaN/blank. */
export function normalizePayuFields(fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, raw] of Object.entries(fields)) {
    if (raw === null || raw === undefined) continue;
    out[name] = String(raw).trim();
  }

  // Amount must be a plain number string (e.g. "50.00"), never "₹50" / "undefined".
  const amountRaw = out.amount ?? '';
  const amountNum = Number(String(amountRaw).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error(
      `PayU amount is invalid (${JSON.stringify(fields.amount)}). Refusing to open checkout.`,
    );
  }
  out.amount = amountNum.toFixed(2);

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
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payuUrl;
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';
  Object.entries(safe).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
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
