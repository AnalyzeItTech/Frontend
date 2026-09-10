import { getAuthHeaders } from './auth';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

export async function getBillingTiers() {
  const res = await fetch(`${API_V1}/billing/tiers`);
  if (!res.ok) throw new Error('Could not load plans');
  return res.json() as Promise<{ tiers: Record<string, Record<string, unknown>> }>;
}

export async function getEntitlements() {
  const res = await fetch(`${API_V1}/billing/entitlements`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Could not load entitlements');
  return res.json();
}

export async function startCheckout(plan: 'premium' | 'premium_plus') {
  const res = await fetch(`${API_V1}/billing/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Checkout failed');
  return res.json() as Promise<{ txnid: string; plan: string; sandbox?: boolean; amount: number }>;
}

export async function completeSandboxCheckout(txnid: string, plan: string) {
  const res = await fetch(`${API_V1}/billing/sandbox-complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ txnid, plan }),
  });
  if (!res.ok) throw new Error('Could not complete sandbox payment');
  return res.json();
}

export async function cancelSubscription() {
  const res = await fetch(`${API_V1}/billing/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Could not cancel');
  return res.json();
}

export async function listNamedLayouts(projectId: string) {
  const res = await fetch(`${API_V1}/projects/${projectId}/layouts`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Could not list layouts');
  return res.json() as Promise<Array<{ id: string; name: string; version: number; layout_json: { widgets?: unknown[] } }>>;
}

export async function createNamedLayout(projectId: string, name: string, layoutJson: Record<string, unknown>) {
  const res = await fetch(`${API_V1}/projects/${projectId}/layouts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, layout_json: layoutJson }),
  });
  if (!res.ok) throw new Error('Could not save layout');
  return res.json();
}
