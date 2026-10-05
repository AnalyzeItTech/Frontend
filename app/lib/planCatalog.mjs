// One description of what each plan includes, used by the home page, /products and Billing so they cannot drift apart.
// Numbers come from the Backend tier table (entitlements.py); change them there and here together.

import { CONTEXT_RETENTION_TOKENS, formatContextRetention } from './contextWall.mjs';

export const USD_REFERENCE = { free: 0, premium: 19, premium_plus: 49 };

export const PLAN_NAMES = { free: 'Free', premium: 'Premium', premium_plus: 'VIP' };

const memory = (tokens, extra = '') => `${formatContextRetention(tokens)} tokens of memory${extra}`;

export const PLAN_FEATURES = {
  free: [
    'Requires an AnalyzeIt account',
    '3 projects · 12 dashboard widgets',
    '50,000 tokens a month · smaller model',
    '40 AI runs a month (weather, FX and math answers are free)',
    memory(CONTEXT_RETENTION_TOKENS.free, ' · 7-day artifacts'),
    'Sponsored units after research runs',
  ],
  premium: [
    'Everything in Free',
    'Better model · 10M tokens a month',
    'Unlimited AI runs',
    '15 projects · 30 widgets · 3 running at once',
    memory(CONTEXT_RETENTION_TOKENS.premium, ' · 30-day artifacts'),
    'Ad-free · personal link: yourname.analyzeit.in',
  ],
  premium_plus: [
    'Everything in Premium',
    'Large model · 50M tokens a month',
    '50 projects · 10 running at once',
    memory(CONTEXT_RETENTION_TOKENS.premium_plus, ' · searched across all your projects'),
    '90-day artifacts',
    'Priority when the agent is busy',
    'Deeper multi-step reading for long documents',
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
  return `${ccy} ${n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
}

export function priceNote(row, usdFallback) {
  if (usdFallback === 0) return 'No charge';
  const n = row && row.amount != null ? Number(row.amount) : NaN;
  if (!row || !Number.isFinite(n)) return `Shown in USD for now. Your live INR price appears at checkout (about $${usdFallback}).`;
  return `${row.currency || 'INR'} per month via Razorpay · $${usdFallback} USD reference`;
}
