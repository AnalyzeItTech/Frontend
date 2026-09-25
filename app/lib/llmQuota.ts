/** Free-plan monthly LLM run quota — mirrors Backend A entitlements (PR #12). */

export type LlmQuota = {
  limit: number | null;
  used: number;
  remaining: number | null;
  nearCap: boolean;
  exhausted: boolean;
  unlimited: boolean;
  period?: string;
  /** True when we should show the chip (capped plans only). */
  show: boolean;
  /** monthly llm_runs once A ships; tokens is interim daily fallback. */
  unit: 'runs' | 'tokens';
};

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isNearCap(remaining: number, limit: number, flag?: boolean): boolean {
  if (flag === true) return true;
  if (remaining <= 0) return true;
  if (remaining <= 10) return true;
  if (limit > 0 && remaining <= Math.ceil(limit * 0.15)) return true;
  return false;
}

function resolvePeriod(snap: Record<string, unknown>): string | undefined {
  if (typeof snap.llm_runs_month === 'string') return snap.llm_runs_month;
  if (typeof snap.llm_runs_period === 'string') return snap.llm_runs_period;
  return undefined;
}

/** Backend A: null / <=0 llm_runs_per_month means unlimited (Premium+). */
function resolveUnlimited(snap: Record<string, unknown>, tier: string): boolean {
  if (snap.llm_runs_unlimited === true) return true;
  if ('llm_runs_per_month' in snap) {
    if (snap.llm_runs_per_month == null) return true;
    const n = num(snap.llm_runs_per_month);
    return n !== null && n <= 0;
  }
  if ('llm_runs_limit' in snap) {
    if (snap.llm_runs_limit == null) return true;
    const n = num(snap.llm_runs_limit);
    return n !== null && n <= 0;
  }
  // Pre-ship: paid tiers without monthly fields yet.
  return tier === 'premium' || tier === 'premium_plus';
}

/**
 * Backend A / Overseer fields on entitlements snapshot:
 * llm_runs_per_month (null = unlimited), llm_runs_limit (alias),
 * llm_runs_used, llm_runs_remaining, llm_runs_month,
 * optional llm_runs_unlimited / near_cap / exhausted
 *
 * Hard wall: HTTP 429 code LLM_MONTHLY_QUOTA + upgrade_required.
 * Falls back to daily tokens_* only when no monthly llm_runs fields are present yet.
 */
export function parseLlmQuota(snap: Record<string, unknown> | null | undefined): LlmQuota | null {
  if (!snap) return null;
  const tier = String(snap.tier || 'free').toLowerCase();
  const period = resolvePeriod(snap);
  const unlimited = resolveUnlimited(snap, tier);

  const hasMonthly =
    'llm_runs_per_month' in snap ||
    'llm_runs_limit' in snap ||
    snap.llm_runs_used != null ||
    snap.llm_runs_remaining != null ||
    snap.llm_runs_unlimited != null ||
    snap.llm_runs_exhausted != null ||
    snap.llm_runs_month != null ||
    snap.llm_runs_period != null;

  if (hasMonthly) {
    if (unlimited) {
      return {
        limit: null,
        used: num(snap.llm_runs_used) ?? 0,
        remaining: null,
        nearCap: false,
        exhausted: false,
        unlimited: true,
        period,
        show: false,
        unit: 'runs',
      };
    }

    const limit =
      num(snap.llm_runs_per_month) ??
      num(snap.llm_runs_limit) ??
      75;
    const used = num(snap.llm_runs_used) ?? 0;
    const remaining =
      num(snap.llm_runs_remaining) ?? Math.max(0, limit - used);
    const exhausted =
      snap.llm_runs_exhausted === true || remaining <= 0;
    const nearCap =
      exhausted ||
      isNearCap(remaining, limit, snap.llm_runs_near_cap === true);

    return {
      limit,
      used,
      remaining: Math.max(0, remaining),
      nearCap,
      exhausted,
      unlimited: false,
      period,
      show: true,
      unit: 'runs',
    };
  }

  // Interim: daily token budget until A ships llm_runs_*.
  const tokenLimit = num(snap.tokens_per_day);
  const tokenUsed = num(snap.tokens_used_today) ?? 0;
  if (tokenLimit == null) return null;
  if (unlimited) {
    return {
      limit: null,
      used: 0,
      remaining: null,
      nearCap: false,
      exhausted: false,
      unlimited: true,
      show: false,
      unit: 'tokens',
    };
  }
  const tokenRemaining = Math.max(0, tokenLimit - tokenUsed);
  const exhausted = tokenRemaining <= 0;
  return {
    limit: tokenLimit,
    used: tokenUsed,
    remaining: tokenRemaining,
    nearCap: isNearCap(tokenRemaining, tokenLimit),
    exhausted,
    unlimited: false,
    show: tier === 'free',
    unit: 'tokens',
  };
}

export function formatLlmRunsLeft(quota: LlmQuota): string {
  if (quota.unlimited) return 'Unlimited LLM runs';
  if (quota.unit === 'tokens') {
    if (quota.exhausted) return 'Daily free token budget used';
    const left = quota.remaining ?? 0;
    if (left === 1) return '1 token left today';
    return `${left.toLocaleString()} tokens left today`;
  }
  if (quota.exhausted) return 'No LLM runs left this month';
  const left = quota.remaining ?? 0;
  if (left === 1) return '1 LLM run left';
  return `${left} LLM runs left`;
}

/** True when chat hard-wall is the monthly LLM ceiling. */
export function isLlmMonthlyQuotaError(err: { code?: string; upgradeRequired?: boolean; status?: number } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === 'LLM_MONTHLY_QUOTA' || err.code === 'LLM_QUOTA' || err.code === 'LLM_RUNS') return true;
  return Boolean(err.upgradeRequired && err.status === 429);
}
