/** Free-plan monthly LLM run quota helpers (entitlements-driven). */

export type LlmQuota = {
  limit: number;
  used: number;
  remaining: number;
  nearCap: boolean;
  exhausted: boolean;
  /** True when we should show the chip (free / capped plans). */
  show: boolean;
  /** monthly llm_runs once A ships; tokens is interim daily fallback. */
  unit: 'runs' | 'tokens';
};

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * Prefer monthly llm_runs_* from A; fall back to daily tokens_* so chrome
 * still works before Banckend lands the monthly fields.
 */
export function parseLlmQuota(snap: Record<string, unknown> | null | undefined): LlmQuota | null {
  if (!snap) return null;
  const tier = String(snap.tier || 'free').toLowerCase();

  const limit =
    num(snap.llm_runs_limit) ??
    num(snap.llm_runs_per_month) ??
    num((snap.llm_runs as Record<string, unknown> | undefined)?.limit);
  const used =
    num(snap.llm_runs_used) ??
    num(snap.llm_runs_used_this_month) ??
    num((snap.llm_runs as Record<string, unknown> | undefined)?.used);
  let remaining =
    num(snap.llm_runs_remaining) ??
    num((snap.llm_runs as Record<string, unknown> | undefined)?.remaining);

  // Fallback: daily token budget as a coarse stand-in.
  if (limit == null && remaining == null) {
    const tokenLimit = num(snap.tokens_per_day);
    const tokenUsed = num(snap.tokens_used_today) ?? 0;
    if (tokenLimit == null) return null;
    const tokenRemaining = Math.max(0, tokenLimit - tokenUsed);
    const near = tokenRemaining <= Math.max(1, Math.ceil(tokenLimit * 0.15));
    return {
      limit: tokenLimit,
      used: tokenUsed,
      remaining: tokenRemaining,
      nearCap: near || tokenRemaining === 0,
      exhausted: tokenRemaining <= 0,
      // Only surface on free until monthly llm_runs ships for all tiers.
      show: tier === 'free' || tier === 'free_trial',
      unit: 'tokens',
    };
  }

  const resolvedLimit = limit ?? (remaining != null && used != null ? remaining + used : remaining ?? 0);
  const resolvedUsed = used ?? (remaining != null ? Math.max(0, resolvedLimit - remaining) : 0);
  const resolvedRemaining = remaining ?? Math.max(0, resolvedLimit - resolvedUsed);
  const nearFlag = snap.llm_runs_near_cap === true || snap.near_llm_cap === true;
  const near = nearFlag || resolvedRemaining <= Math.max(1, Math.ceil(resolvedLimit * 0.15));

  return {
    limit: resolvedLimit,
    used: resolvedUsed,
    remaining: Math.max(0, resolvedRemaining),
    nearCap: near || resolvedRemaining <= 0,
    exhausted: resolvedRemaining <= 0 || snap.llm_runs_exhausted === true,
    show: tier === 'free' || tier === 'free_trial' || limit != null,
    unit: 'runs',
  };
}

export function formatLlmRunsLeft(quota: LlmQuota): string {
  if (quota.unit === 'tokens') {
    if (quota.exhausted) return 'Daily free token budget used';
    if (quota.remaining === 1) return '1 token left today';
    return `${quota.remaining.toLocaleString()} tokens left today`;
  }
  if (quota.exhausted) return 'No LLM runs left this month';
  if (quota.remaining === 1) return '1 LLM run left';
  return `${quota.remaining} LLM runs left`;
}
