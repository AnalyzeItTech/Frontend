/**
 * Profile hero copy.
 *
 * Tier names follow `planTierLabel` in auth.ts: `free` and a leftover
 * `free_trial` are Free (trial is not a plan). `premium_plus` is VIP.
 *
 * Usage is monthly LLM runs (`llm_runs_used` / `llm_runs_per_month`).
 * A daily token fallback is not relabeled as runs.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(n));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** `YYYY-MM` from `llm_runs_month` / `llm_runs_period`, or null. */
export function profilePeriodLabel(period) {
  if (typeof period !== 'string') return null;
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${month} ${match[1]}`;
}

/** Free / Premium / VIP. Same normalization as planTierLabel, then display names. */
export function profileTierName(raw) {
  const tier = String(raw || 'free').trim().toLowerCase();
  if (tier === 'free' || tier === 'free_trial') return 'Free';
  if (tier === 'premium') return 'Premium';
  if (tier === 'premium_plus' || tier === 'vip') return 'VIP';
  const label = tier.replace(/_/g, ' ');
  return label.replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
}

/** Same initials rule as the shared account menu. */
export function profileInitials(name, email) {
  const source =
    (typeof name === 'string' && name.trim()) ||
    (typeof email === 'string' && email.trim()) ||
    'U';
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function unavailableUsage() {
  return {
    available: false,
    used: null,
    ceiling: null,
    unlimited: false,
    nearCap: false,
    exhausted: false,
    showUpgrade: false,
    remaining: null,
    percent: 0,
    periodLabel: null,
    summary: 'Monthly LLM runs will appear here once this account includes run usage.',
    detail: '',
    footnote: '',
  };
}

/**
 * @param {object | null | undefined} quota Parsed `parseLlmQuota` snapshot.
 * @param {string | null | undefined} tier Account tier (`free`, `premium`, `premium_plus`).
 */
export function profileMonthUsage(quota, tier) {
  if (!quota || quota.unit !== 'runs') return unavailableUsage();

  const periodLabel = profilePeriodLabel(quota.period);
  const used = Number.isFinite(Number(quota.used)) ? Math.max(0, Math.round(Number(quota.used))) : 0;
  const normalized = String(tier || 'free').trim().toLowerCase();
  const topTier = normalized === 'premium_plus' || normalized === 'vip';

  if (quota.unlimited || quota.limit == null) {
    return {
      available: true,
      used,
      ceiling: null,
      unlimited: true,
      nearCap: false,
      exhausted: false,
      showUpgrade: false,
      remaining: null,
      percent: 0,
      periodLabel,
      summary: `${formatCount(used)} LLM runs this month`,
      detail: 'No monthly ceiling on this plan.',
      footnote: '',
    };
  }

  const ceiling = Math.max(0, Math.round(Number(quota.limit)));
  const remainingRaw = quota.remaining == null ? ceiling - used : Number(quota.remaining);
  const remaining = Number.isFinite(remainingRaw)
    ? Math.max(0, Math.round(remainingRaw))
    : Math.max(0, ceiling - used);
  const exhausted = quota.exhausted === true || remaining <= 0;
  const nearCap = exhausted || quota.nearCap === true;
  const showUpgrade = nearCap && !topTier;
  const percent = ceiling > 0 ? Math.min(100, Math.round((used / ceiling) * 100)) : exhausted ? 100 : 0;

  let detail = '';
  if (exhausted) {
    detail = "You have used this month's LLM runs.";
  } else if (nearCap) {
    detail =
      remaining === 1
        ? '1 LLM run left this month.'
        : `${formatCount(remaining)} LLM runs left this month.`;
  }

  return {
    available: true,
    used,
    ceiling,
    unlimited: false,
    nearCap,
    exhausted,
    showUpgrade,
    remaining,
    percent,
    periodLabel,
    summary: `${formatCount(used)} / ${formatCount(ceiling)} LLM runs this month`,
    detail,
    footnote: 'Runs that use no model tokens do not count toward this ceiling.',
  };
}
