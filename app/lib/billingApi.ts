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

export function submitPayuForm(payuUrl: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payuUrl;
  form.style.display = 'none';
  Object.entries(fields).forEach(([name, value]) => {
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
