// One description of what each plan includes, used by the home page, /products and Billing so they cannot drift apart.
// Numbers come from the Backend tier table (entitlements.py); change them there and here together.

import { CONTEXT_RETENTION_TOKENS, RETENTION_HOT_TOKENS, formatContextRetention } from './contextWall.mjs';

/** A year is charged as ten months. Matches the Backend's ANNUAL_MONTHS_CHARGED. */
export const ANNUAL_MONTHS = 10;
export const USD_REFERENCE = { free: 0, premium: 19, premium_plus: 49 };

export const PLAN_NAMES = { free: 'Free', premium: 'Premium', premium_plus: 'VIP' };

const memory = (tokens, extra = '') => `${formatContextRetention(tokens)} tokens of memory${extra}`;

export const PLAN_FEATURES = {
  free: [
    'Requires an AnalyzeIt account',
    '3 projects · 12 dashboard widgets',
    '50,000 tokens a month (output counts four times) · smaller model',
    '40 AI runs a month (weather, FX and math answers are free)',
    memory(CONTEXT_RETENTION_TOKENS.free, ' · 7-day artifacts'),
    'Sponsored units after research runs',
  ],
  premium: [
    'Everything in Free',
    'Better model · 10M tokens a month (output counts four times)',
    // Paid tiers: no AI-runs bullet. Do not invent a run count (Backend llm_runs_per_month is 0).
    '15 projects · 30 widgets · 3 running at once',
    memory(
      CONTEXT_RETENTION_TOKENS.premium,
      ` · ${formatContextRetention(RETENTION_HOT_TOKENS.premium)} hot-searchable · 30-day artifacts`,
    ),
    'Reads long pasted documents section by section (about 150,000 characters)',
    'Ad-free · personal link: yourname.analyzeit.in',
  ],
  premium_plus: [
    'Everything in Premium',
    'Large model · 50M tokens a month (output counts four times)',
    // Paid tiers: no AI-runs bullet. Do not invent a run count (Backend llm_runs_per_month is 0).
    '50 projects · 10 running at once',
    memory(
      CONTEXT_RETENTION_TOKENS.premium_plus,
      ` · ${formatContextRetention(RETENTION_HOT_TOKENS.premium_plus)} hot-searchable · searched across all your projects`,
    ),
    '90-day artifacts',
    'Priority when the agent is busy',
    'Reads long pasted documents section by section (about 300,000 characters)',
  ],
};

export const PLAN_TAGLINES = {
  free: 'Personal research after you create an account. Enough to run the ask → tools → answer loop.',
  premium: 'Deeper runs: a better model, more tokens, no ads.',
  premium_plus: 'The heaviest research: the largest model, the biggest memory, and priority when the agent is busy.',
};

/**
 * What to show for a plan's price. Rupees are whole numbers ("₹1,815", never "₹1,814.76"); with no live quote it
 * falls back to the USD reference rather than inventing a rupee figure.
 * @param {{ currency?: string, amount?: number | string | null, amount_display?: string } | undefined | null} row
 * @param {number} usdFallback
 */
export function priceLabel(row, usdFallback) {
  const n = row && row.amount != null ? Number(row.amount) : NaN;
  if (!row || !Number.isFinite(n)) return usdFallback === 0 ? '₹0' : `$${usdFallback}`;
  const ccy = row.currency || 'INR';
  if (ccy === 'INR') return `₹${Math.round(n).toLocaleString('en-IN')}`;
  const whole = ['JPY', 'KRW', 'VND', 'CLP', 'ISK'].includes(ccy);
  try {
    // Whole units for display ("£15", not "£14.37") only when the amount is already whole; otherwise keep the pence.
    return new Intl.NumberFormat('en', { style: 'currency', currency: ccy, currencyDisplay: 'symbol', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(whole ? 0 : 2)}`;
  }
}

export function priceNote(row, usdFallback, annual = false) {
  if (usdFallback === 0) return 'No charge';
  const n = row && row.amount != null ? Number(row.amount) : NaN;
  if (!row || !Number.isFinite(n)) return `Shown in USD for now. Your live price appears at checkout (about $${usdFallback}).`;
  const ccy = row.currency || 'INR';
  const per = annual ? 'per year' : 'per month';
  if (ccy === 'INR' && row.recurring !== false) return `INR ${per} via Razorpay · $${usdFallback} USD reference`;
  if (row.recurring) return `${ccy} ${per} via Razorpay · $${usdFallback} USD reference`;
  return `${ccy} via Razorpay · ${annual ? '1 year' : '30 days'} per payment · $${usdFallback} USD reference`;
}

const PLAN_IDS = ['free', 'premium', 'premium_plus'];

/**
 * Price line and note for Free, Premium and VIP from one quote.
 * Home and /products both render this, so Premium cannot show a USD-only fallback
 * on one page while the other shows whole rupees. USD stays in the note as a reference.
 * With no quote row, paid plans use the USD reference — a rupee figure is never invented.
 * @param {{ plans?: Record<string, { currency?: string, amount?: number | string | null }> } | null | undefined} quote
 */
export function presentPlans(quote, interval = 'monthly') {
  const annual = interval === 'annual';
  return PLAN_IDS.map((id) => {
    const usd = annual ? USD_REFERENCE[id] * ANNUAL_MONTHS : USD_REFERENCE[id];
    const row = id === 'free' ? { currency: 'INR', amount: 0 } : (annual ? quote?.annual_plans : quote?.plans)?.[id];
    return {
      id,
      name: PLAN_NAMES[id],
      tagline: PLAN_TAGLINES[id],
      features: PLAN_FEATURES[id],
      price: priceLabel(row, usd),
      note: priceNote(row, usd, annual),
      period: annual && id !== 'free' ? '/yr' : '/mo',
    };
  });
}
