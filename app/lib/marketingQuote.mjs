// Live public quote for marketing pages. Null when billing cannot be reached —
// callers must not invent a rupee price in that case.

function money(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Checkout quote for a country (INR in India, the local currency elsewhere). Same endpoint the homepage asks for in the browser. */
export async function loadMarketingQuote(country = 'IN') {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/v1/billing/quote?country=${encodeURIComponent(country || 'IN')}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const plans = data?.plans;
    if (!plans || typeof plans !== 'object') return null;
    for (const key of ['premium', 'premium_plus']) {
      const row = plans[key];
      if (!row || typeof row !== 'object') continue;
      const n = money(row.amount);
      if (n != null) row.amount = n;
    }
    return data;
  } catch {
    return null;
  }
}
