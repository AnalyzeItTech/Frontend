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

/** Model picker allowlist (size tiers; Foundry deployment ids come from B when present). */
export async function getModels() {
  const res = await fetch(`${API_V1}/models`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Could not load models'));
  return res.json() as Promise<{
    model_access?: string;
    default?: string;
    models?: Array<Record<string, unknown>>;
  }>;
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
  amount: number;
  amount_paise?: number;
  amount_usd?: number;
  currency?: string;
  country?: string | null;
  order_id: string;
  key_id?: string;
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

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
  const headers = getStoredToken() ? getAuthHeaders() : undefined;
  const res = await fetch(`${API_V1}/billing/quote?country=${encodeURIComponent(country)}`, {
    ...(headers ? { headers } : {}),
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
  phone?: string,
): Promise<CheckoutSession> {
  const res = await fetch(`${API_V1}/billing/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      plan,
      country: country || detectBillingCountry(),
      ...(phone ? { phone } : {}),
    }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Checkout failed'));
  const session = (await res.json()) as CheckoutSession;
  const n = coerceMoney(session.amount);
  if (n != null) session.amount = n;
  return session;
}

export async function verifyRazorpayPayment(payload: RazorpaySuccess) {
  const res = await fetch(`${API_V1}/billing/verify-payment`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, 'Payment could not be verified'));
  return res.json() as Promise<{ success: boolean }>;
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay runs in the browser'));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(session: CheckoutSession): Promise<'paid' | 'cancelled'> {
  await loadRazorpayScript();
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || session.key_id;
  if (!key) throw new Error('Razorpay is not configured');
  if (!session.order_id) throw new Error('Missing Razorpay order');
  if (!window.Razorpay) throw new Error('Razorpay checkout failed to load');
  const Razorpay = window.Razorpay;
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key,
      order_id: session.order_id,
      amount: session.amount_paise,
      currency: session.currency || 'INR',
      name: 'AnalyzeIt',
      description: session.plan,
      handler: async (response: RazorpaySuccess) => {
        try {
          await verifyRazorpayPayment(response);
          resolve('paid');
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Payment could not be verified'));
        }
      },
      modal: {
        ondismiss: () => resolve('cancelled'),
      },
    });
    checkout.on('payment.failed', (response) => {
      reject(new Error(response?.error?.description || 'Payment failed'));
    });
    checkout.open();
  });
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

/** Optional rewarded/sponsored unlock for one Free LLM run. */

export async function startAdExtendChallenge(): Promise<{
  ok: boolean;
  needed?: boolean;
  alreadyClaimed?: boolean;
  challengeId?: string;
  minWatchSeconds?: number;
  remaining?: number;
  message?: string;
}> {
  const res = await fetch(`${API_V1}/billing/ad-extend/challenge`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (res.status === 404) {
    return { ok: false, message: 'Sponsored unlock is not available yet — upgrade for more runs.' };
  }
  if (!res.ok) {
    return { ok: false, message: await readError(res, 'Could not start sponsored unlock') };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    ok: true,
    needed: body.needed !== false,
    alreadyClaimed: Boolean(body.already_claimed),
    challengeId: typeof body.challenge_id === 'string' ? body.challenge_id : undefined,
    minWatchSeconds: typeof body.min_watch_seconds === 'number' ? body.min_watch_seconds : 15,
    remaining: typeof body.llm_runs_remaining === 'number' ? body.llm_runs_remaining : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}

export async function claimAdExtend(challengeId: string): Promise<{ ok: boolean; remaining?: number; message?: string }> {
  const res = await fetch(`${API_V1}/billing/ad-extend`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId }),
  });
  if (res.status === 404) {
    return { ok: false, message: 'Sponsored unlock is not available yet — upgrade for more runs.' };
  }
  if (!res.ok) {
    return { ok: false, message: await readError(res, 'Could not unlock a run') };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const remaining =
    typeof body.llm_runs_remaining === 'number'
      ? body.llm_runs_remaining
      : typeof body.remaining === 'number'
        ? body.remaining
        : undefined;
  return { ok: true, remaining, message: typeof body.message === 'string' ? body.message : undefined };
}
