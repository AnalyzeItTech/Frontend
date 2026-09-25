/**
 * Free context / pipeline soft-fail signals on the chat stream.
 *
 * Same object shape as TOKEN_BUDGET / LLM_MONTHLY_QUOTA:
 *   { code, message, upgrade_required, recoverable }
 * Stream/final also uses:
 *   error.code
 *   error_code          (final.error_code)
 *
 * Codes (exact, do not alias):
 *   CLIENT_CONTEXT_TRUNCATED   — Backend A soft-trim nudge. Opens the Free
 *                                context sheet (10M client context). Never
 *                                softFail by itself (pipeline can still proceed).
 *   PIPELINE_INSUFFICIENT_DATA — pipeline softFail when recoverable is not
 *                                explicitly false. Not a context wall: do not
 *                                quote Free context retention for this code alone.
 *                                upgrade_required without a truncate opens a
 *                                capacity sheet.
 *
 * INPUT_TOO_LARGE is a separate Backend HTTP 413 (message over ~1.5M), not the
 * Free context-retention wall. Quota codes stay on the quota modal path.
 *
 * Listed retention is memory. This module does not truncate on the client.
 */

/**
 * Listed context retention (memory), in tokens.
 * Free is the fallback when entitlements omit a usable ceiling.
 */
export const CONTEXT_RETENTION_TOKENS = {
  free: 10_000_000,
  premium: 500_000_000,
  premium_plus: 1_000_000_000,
};

/** Free retention ceiling. Copy only — the client does not enforce a cap. */
export const FREE_CLIENT_CONTEXT_LIMIT = CONTEXT_RETENTION_TOKENS.free;

/**
 * Prefer live `context_retention_tokens`. Older ceiling fields are fallbacks
 * and only when they are at least 1M, so a retired 20k character cap is never quoted.
 */
const CONTEXT_LIMIT_KEYS = [
  'context_retention_tokens',
  'contextRetentionTokens',
  'max_client_context_chars',
  'client_context_limit',
];

export const CLIENT_CONTEXT_TRUNCATED = 'CLIENT_CONTEXT_TRUNCATED';
export const PIPELINE_INSUFFICIENT_DATA = 'PIPELINE_INSUFFICIENT_DATA';

export const PIPELINE_FAIL_TEXT = 'Pipeline could not complete with available data';

/** Quota walls that already open the quota Upgrade modal — not this context wall. */
const QUOTA_CODES = new Set(['TOKEN_BUDGET', 'LLM_MONTHLY_QUOTA', 'LLM_QUOTA', 'LLM_RUNS']);

/**
 * @param {number} tokens
 */
export function formatContextRetention(tokens) {
  const n = Number(tokens);
  if (!Number.isFinite(n) || n <= 0) return formatContextRetention(CONTEXT_RETENTION_TOKENS.free);
  if (n % 1_000_000_000 === 0) return `${n / 1_000_000_000}B`;
  if (n % 1_000_000 === 0) return `${n / 1_000_000}M`;
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    const rounded = Math.round(v * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}M`;
  }
  return n.toLocaleString('en-US');
}

/**
 * @param {number} [limit]
 * @returns {string}
 */
export function formatFreeContextLimit(limit = FREE_CLIENT_CONTEXT_LIMIT) {
  const n = Number(limit);
  const value = Number.isFinite(n) && n >= 1_000_000 ? n : FREE_CLIENT_CONTEXT_LIMIT;
  return formatContextRetention(value);
}

/**
 * Quote retention from an entitlements or tier snapshot.
 * `context_retention_tokens` wins. Missing values, and anything below 1M
 * (including the retired 20k character cap), fall back to Free 10M.
 *
 * @param {unknown} source
 * @returns {string}
 */
export function quoteFreeContextLimit(source) {
  const found = findContextLimit(source, 0);
  return formatFreeContextLimit(found ?? FREE_CLIENT_CONTEXT_LIMIT);
}

/**
 * Raw live retention when the entitlements snapshot includes it.
 * Does not treat `max_client_context_chars` as retention.
 * @param {unknown} snap
 * @returns {number | null}
 */
export function retentionTokensFromEntitlements(snap) {
  if (!snap || typeof snap !== 'object') return null;
  const rec = /** @type {Record<string, unknown>} */ (snap);
  const raw = rec.context_retention_tokens ?? rec.contextRetentionTokens;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

/**
 * @param {unknown} source
 * @param {number} depth
 * @returns {number | null}
 */
function findContextLimit(source, depth) {
  if (depth > 2) return null;
  const rec = asRecord(source);
  if (!rec) return null;
  for (const key of CONTEXT_LIMIT_KEYS) {
    const n = readLimitNumber(rec[key]);
    if (n != null && n >= 1_000_000) return n;
  }
  for (const key of ['limits', 'entitlements', 'free', 'tier', 'context']) {
    if (!(key in rec)) continue;
    const nested = findContextLimit(rec[key], depth + 1);
    if (nested != null) return nested;
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function readLimitNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const million = text.match(/^(\d+(?:\.\d+)?)\s*M$/i);
  if (million) return Number(million[1]) * 1_000_000;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Context sheet only. Names listed Premium and VIP retention.
 * @param {string} [limitLabel]
 */
export function contextUpgradeBody(limitLabel = formatFreeContextLimit()) {
  const limit = limitLabel || formatFreeContextLimit();
  const premium = formatContextRetention(CONTEXT_RETENTION_TOKENS.premium);
  const vip = formatContextRetention(CONTEXT_RETENTION_TOKENS.premium_plus);
  return `Free context retention (memory) is ${limit}, so this request hit a context wall. We do not invent the earlier text that was cut. Premium context retention (memory) is ${premium}; VIP is ${vip}, with compression and recursive inspect (RLM).`;
}

/**
 * @param {number | null | undefined} [freeTokens] live entitlement, else listed Free 10M
 */
export function contextUpgradeCopy(freeTokens) {
  const label =
    freeTokens == null ? formatFreeContextLimit() : formatFreeContextLimit(freeTokens);
  return {
    title: 'Free hit a context limit',
    body: contextUpgradeBody(label),
  };
}

export const CONTEXT_UPGRADE_COPY = contextUpgradeCopy();

/** Pipeline / upgrade_required without a truncate. Not the Free context-limit sheet. */
export const CAPACITY_UPGRADE_COPY = {
  title: 'Research needs more capacity',
  body: 'This research run needs more capacity than Free can finish with. Premium adds a deeper context mode so longer research can complete.',
};

const TRUNCATE_NOTICE_FIELDS = ['notice', 'truncate_notice', 'context_notice'];

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function asRecord(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return /** @type {Record<string, unknown>} */ (value);
  }
  return null;
}

/**
 * @typedef {Object} StructuredSignal
 * @property {string[]} codes
 * @property {boolean} upgradeRequired
 * @property {boolean} recoverable
 * @property {boolean} recoverableExplicitFalse
 * @property {string} message
 */

/**
 * Root plus error / detail, the same places quota and context codes nest.
 * @param {unknown} payload
 * @returns {Record<string, unknown>[]}
 */
function signalRecords(payload) {
  const root = asRecord(payload);
  if (!root) return [];
  const nested = [asRecord(root.error), asRecord(root.detail)].filter(
    (rec) => rec != null,
  );
  return [root, ...nested];
}

/**
 * Explicit truncate notice — not inferred from a pipeline code or free text.
 * @param {unknown} value
 */
function isTruncateNoticeValue(value) {
  if (value === true || value === CLIENT_CONTEXT_TRUNCATED) return true;
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text || text === PIPELINE_INSUFFICIENT_DATA) return false;
  return /truncat/i.test(text);
}

/**
 * @param {Record<string, unknown>[]} records
 * @param {string[]} codes
 */
function payloadMarksTruncation(records, codes) {
  if (codes.includes(CLIENT_CONTEXT_TRUNCATED)) return true;
  let notice = false;
  let truncatedFlag = false;
  for (const rec of records) {
    if (rec.client_context_truncated === true) notice = true;
    if (rec.truncated === true) truncatedFlag = true;
    for (const key of TRUNCATE_NOTICE_FIELDS) {
      if (isTruncateNoticeValue(rec[key])) notice = true;
    }
  }
  if (notice) return true;
  if (!truncatedFlag) return false;
  const quotaOnly =
    codes.some((code) => QUOTA_CODES.has(code)) &&
    !codes.includes(PIPELINE_INSUFFICIENT_DATA) &&
    !codes.includes(CLIENT_CONTEXT_TRUNCATED);
  return !quotaOnly;
}

/**
 * Read the shared quota/context error object.
 * Locations: code, error.code, error_code, and the same fields under detail
 * (HTTP body shape used by parseApiFailure for LLM_MONTHLY_QUOTA).
 *
 * @param {unknown} payload
 * @returns {StructuredSignal | null}
 */
export function readStructuredSignal(payload) {
  const records = signalRecords(payload);
  if (!records.length) return null;

  /** @type {string[]} */
  const codes = [];
  for (const rec of records) {
    if (typeof rec.code === 'string' && rec.code.trim()) codes.push(rec.code.trim());
    if (typeof rec.error_code === 'string' && rec.error_code.trim()) codes.push(rec.error_code.trim());
  }
  const unique = [...new Set(codes)];

  const upgradeRequired = records.some((rec) => rec.upgrade_required === true);
  const recoverable = records.some((rec) => rec.recoverable === true);
  const recoverableExplicitFalse = records.some((rec) => rec.recoverable === false);

  let message = '';
  for (const rec of records) {
    if (typeof rec.message === 'string' && rec.message.trim()) {
      message = rec.message.trim();
      break;
    }
  }

  if (!unique.length && !upgradeRequired && !recoverable) return null;
  return { codes: unique, upgradeRequired, recoverable, recoverableExplicitFalse, message };
}

/**
 * @param {string} code
 */
export function isContextWallCode(code) {
  return code === CLIENT_CONTEXT_TRUNCATED || code === PIPELINE_INSUFFICIENT_DATA;
}

/**
 * @param {string} code
 */
export function isQuotaCode(code) {
  return QUOTA_CODES.has(code);
}

/**
 * @typedef {Object} ContextWallSignal
 * @property {'CLIENT_CONTEXT_TRUNCATED' | 'PIPELINE_INSUFFICIENT_DATA' | undefined} [code]
 * @property {boolean} truncated
 * @property {boolean} pipeline
 * @property {boolean} upgradeRequired
 * @property {boolean} recoverable
 * @property {boolean} openUpgrade
 * @property {'context' | 'capacity'} [upgradeReason]
 *   context — Free context-limit sheet (truncate / CLIENT_CONTEXT_TRUNCATED only).
 *   capacity — upgrade_required without a truncate. Not the context-retention sheet.
 * @property {boolean} softFail
 * @property {string} [message]
 */

/**
 * Context sheet only when truncation is known. upgrade_required without a
 * truncate still opens upgrade, under the capacity reason.
 * @param {boolean} truncated
 * @param {boolean} upgradeRequired
 * @returns {{ openUpgrade: boolean, upgradeReason: 'context' | 'capacity' | undefined }}
 */
function upgradeDecision(truncated, upgradeRequired) {
  if (truncated) return { openUpgrade: true, upgradeReason: 'context' };
  if (upgradeRequired) return { openUpgrade: true, upgradeReason: 'capacity' };
  return { openUpgrade: false, upgradeReason: undefined };
}

/**
 * @param {unknown} payload
 * @returns {ContextWallSignal | null}
 */
export function detectContextWall(payload) {
  const raw = readStructuredSignal(payload);
  if (!raw) return null;

  const records = signalRecords(payload);
  const truncated = payloadMarksTruncation(records, raw.codes);
  const pipeline = raw.codes.includes(PIPELINE_INSUFFICIENT_DATA);
  const quotaOnly =
    raw.codes.some((code) => QUOTA_CODES.has(code)) && !truncated && !pipeline;
  // TOKEN_BUDGET / LLM_MONTHLY_QUOTA keep the existing quota modal.
  if (quotaOnly) return null;

  const decision = upgradeDecision(truncated, raw.upgradeRequired);
  // Pipeline-only still returns so the soft-fail bubble can show. It must not
  // open the context sheet unless a truncate is also present.
  if (!decision.openUpgrade && !pipeline) return null;

  // Truncation nudge ≠ pipeline softFail. Only PIPELINE_INSUFFICIENT_DATA
  // (recoverable omitted or true) marks the run as softFail.
  // CLIENT_CONTEXT_TRUNCATED may still open the context sheet as a nudge.
  const softFail = pipeline && (raw.recoverable || !raw.recoverableExplicitFalse);

  /** @type {ContextWallSignal['code']} */
  const code = truncated
    ? CLIENT_CONTEXT_TRUNCATED
    : pipeline
      ? PIPELINE_INSUFFICIENT_DATA
      : undefined;

  return {
    code,
    truncated,
    pipeline,
    upgradeRequired: raw.upgradeRequired,
    recoverable: raw.recoverable,
    openUpgrade: decision.openUpgrade,
    upgradeReason: decision.upgradeReason,
    softFail,
    message: raw.message || undefined,
  };
}

/**
 * Quota-shaped stream/HTTP object (TOKEN_BUDGET, LLM_MONTHLY_QUOTA, …).
 * Null when a context-wall code is also present.
 *
 * @param {unknown} payload
 * @returns {{ code: string, message: string, upgradeRequired: boolean, recoverable: boolean } | null}
 */
export function readQuotaSignal(payload) {
  const raw = readStructuredSignal(payload);
  if (!raw) return null;
  if (raw.codes.some((code) => isContextWallCode(code))) return null;
  const code = raw.codes.find((item) => QUOTA_CODES.has(item));
  if (!code) return null;
  return {
    code,
    message: raw.message,
    upgradeRequired: raw.upgradeRequired,
    recoverable: raw.recoverable,
  };
}

/**
 * @param {ContextWallSignal | null | undefined} current
 * @param {ContextWallSignal | null | undefined} next
 * @returns {ContextWallSignal | null}
 */
export function mergeContextWall(current, next) {
  if (!current) return next || null;
  if (!next) return current;
  const truncated = current.truncated || next.truncated;
  const pipeline = current.pipeline || next.pipeline;
  const upgradeRequired = current.upgradeRequired || next.upgradeRequired;
  const recoverable = current.recoverable || next.recoverable;
  const decision = upgradeDecision(truncated, upgradeRequired);
  const softFail = current.softFail || next.softFail;
  /** @type {ContextWallSignal['code']} */
  const code = truncated
    ? CLIENT_CONTEXT_TRUNCATED
    : pipeline
      ? PIPELINE_INSUFFICIENT_DATA
      : undefined;
  const message = next.message || current.message;
  return {
    code,
    truncated,
    pipeline,
    upgradeRequired,
    recoverable,
    openUpgrade: decision.openUpgrade,
    upgradeReason: decision.upgradeReason,
    softFail,
    message,
  };
}

/**
 * @param {object | null | undefined} event
 * @returns {ContextWallSignal | null}
 */
export function contextWallFromStreamEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const rec = /** @type {Record<string, unknown>} */ (event);
  const nested = asRecord(rec.payload);
  const payload = nested || rec;
  /** @type {Record<string, unknown>} */
  const merged = { ...payload };
  if (nested) {
    for (const key of [
      'code',
      'error_code',
      'upgrade_required',
      'recoverable',
      'error',
      'message',
      'truncated',
      'client_context_truncated',
      'notice',
      'truncate_notice',
      'context_notice',
    ]) {
      if (merged[key] == null && rec[key] != null) merged[key] = rec[key];
    }
  }
  return detectContextWall(merged);
}

/**
 * @param {string} text
 */
export function answerIsOnlyPipelineFail(text) {
  const normalized = String(text || '').trim().replace(/\s+/g, ' ');
  if (!normalized || !normalized.includes(PIPELINE_FAIL_TEXT)) return false;
  return normalized.length <= PIPELINE_FAIL_TEXT.length + 24;
}

/**
 * Honest copy. Pipeline-only text does not quote a Free retention ceiling.
 * @param {ContextWallSignal} signal
 * @param {string} [limitLabel] Quoted retention label. Defaults to Free 10M.
 */
export function contextWallSummary(signal, limitLabel = formatFreeContextLimit()) {
  const limit = limitLabel || formatFreeContextLimit();
  const paid = `Premium context retention (memory) is ${formatContextRetention(CONTEXT_RETENTION_TOKENS.premium)}; VIP is ${formatContextRetention(CONTEXT_RETENTION_TOKENS.premium_plus)}, with compression and recursive inspect (RLM).`;
  if (signal.truncated && signal.pipeline) {
    return `Free context retention (memory) is ${limit}, and the research pipeline could not complete with the data that remained. The missing earlier text was not invented. ${paid}`;
  }
  if (signal.truncated) {
    return `Free context retention (memory) is ${limit}. Text past that limit was not sent, and the missing part was not invented. ${paid}`;
  }
  // Pipeline-only must not claim a Free context limit.
  if (signal.pipeline) {
    return PIPELINE_FAIL_TEXT;
  }
  return CAPACITY_UPGRADE_COPY.body;
}
