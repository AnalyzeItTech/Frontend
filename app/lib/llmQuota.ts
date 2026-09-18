/** Free-plan monthly LLM run quota — mirrors Overseer entitlements contract. */

export type LlmQuota = {
  limit: number | null;
  used: number;
  remaining: number | null;
  nearCap: boolean;
  exhausted: boolean;
  unlimited: boolean;
  period?: string;
  /** True when we should show the chip (capped Free plans only). */
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

/**
 * Overseer contract fields on entitlements /me:
 * llm_runs_per_month, llm_runs_used, llm_runs_remaining,
 * llm_runs_unlimited, llm_runs_near_cap, llm_runs_exhausted, llm_runs_period
 *
 * Falls back to daily tokens_* only when no monthly llm_runs fields are present yet.
 */
export function parseLlmQuota(snap: Record<string, unknown> | null | undefined): LlmQuota | null {
  if (!snap) return null;
  const tier = String(snap.tier || 'free').toLowerCase();
  const period = typeof snap.llm_runs_period === 'string' ? snap.llm_runs_period : undefined;

  const unlimited =
    snap.llm_runs_unlimited === true ||
    tier === 'premium' ||
    tier === 'premium_plus';

  const hasMonthly =
    snap.llm_runs_per_month != null ||
    snap.llm_runs_limit != null ||
    snap.llm_runs_used != null ||
    snap.llm_runs_remaining != null ||
    snap.llm_runs_unlimited != null ||
    snap.llm_runs_exhausted != null;

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
    show: tier === 'free' || tier === 'free_trial',
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
