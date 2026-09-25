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
 *   CLIENT_CONTEXT_TRUNCATED
 *   PIPELINE_INSUFFICIENT_DATA
 *
 * upgrade_required=true when Free hit the wall.
 * recoverable=true is a soft-fail (retry + upgrade), not a hard error.
 *
 * Describes the Free ceiling. Does not raise it or truncate on the client.
 */

/** Free client_context ceiling enforced by Backend A. Copy only — not a client cap. */
export const FREE_CLIENT_CONTEXT_CHARS = 20000;

export const CLIENT_CONTEXT_TRUNCATED = 'CLIENT_CONTEXT_TRUNCATED';
export const PIPELINE_INSUFFICIENT_DATA = 'PIPELINE_INSUFFICIENT_DATA';

export const PIPELINE_FAIL_TEXT = 'Pipeline could not complete with available data';

/** Quota walls that already open the quota Upgrade modal — not this context wall. */
const QUOTA_CODES = new Set(['TOKEN_BUDGET', 'LLM_MONTHLY_QUOTA', 'LLM_QUOTA', 'LLM_RUNS']);

export const CONTEXT_UPGRADE_COPY = {
  title: 'Free hit a context limit',
  body: `Free soft-truncates client context at ${FREE_CLIENT_CONTEXT_CHARS.toLocaleString('en-US')} characters, so this request hit a context and data wall. We do not invent the earlier text that was cut. Premium keeps a larger client context and can compress or recursively inspect (RLM) longer dossiers.`,
};

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
 * Read the shared quota/context error object.
 * Locations: code, error.code, error_code, and the same fields under detail
 * (HTTP body shape used by parseApiFailure for LLM_MONTHLY_QUOTA).
 *
 * @param {unknown} payload
 * @returns {StructuredSignal | null}
 */
export function readStructuredSignal(payload) {
  const root = asRecord(payload);
  if (!root) return null;

  const nested = [asRecord(root.error), asRecord(root.detail)].filter(
    (rec) => rec != null,
  );
  /** @type {Record<string, unknown>[]} */
  const records = [root, ...nested];

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
 * @property {boolean} softFail
 * @property {string} [message]
 */

/**
 * @param {unknown} payload
 * @returns {ContextWallSignal | null}
 */
export function detectContextWall(payload) {
  const raw = readStructuredSignal(payload);
  if (!raw) return null;

  const truncated = raw.codes.includes(CLIENT_CONTEXT_TRUNCATED);
  const pipeline = raw.codes.includes(PIPELINE_INSUFFICIENT_DATA);
  const contextCode = truncated || pipeline;
  const quotaOnly = raw.codes.some((code) => QUOTA_CODES.has(code)) && !contextCode;
  // TOKEN_BUDGET / LLM_MONTHLY_QUOTA keep the existing quota modal.
  if (quotaOnly) return null;

  const openUpgrade = contextCode || raw.upgradeRequired;
  if (!openUpgrade) return null;

  // recoverable=true is the soft-fail. These codes ship as soft-fails unless
  // recoverable is explicitly false.
  const softFail = raw.recoverable || (contextCode && !raw.recoverableExplicitFalse);

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
    openUpgrade,
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
  const openUpgrade = current.openUpgrade || next.openUpgrade;
  const softFail = current.softFail || next.softFail;
  /** @type {ContextWallSignal['code']} */
  const code = truncated
    ? CLIENT_CONTEXT_TRUNCATED
    : pipeline
      ? PIPELINE_INSUFFICIENT_DATA
      : undefined;
  const message = next.message || current.message;
  return { code, truncated, pipeline, upgradeRequired, recoverable, openUpgrade, softFail, message };
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
    for (const key of ['code', 'error_code', 'upgrade_required', 'recoverable', 'error', 'message']) {
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
 * Honest soft-fail copy. Does not claim missing context was recovered.
 * @param {ContextWallSignal} signal
 */
export function contextWallSummary(signal) {
  const limit = FREE_CLIENT_CONTEXT_CHARS.toLocaleString('en-US');
  if (signal.truncated && signal.pipeline) {
    return `Free soft-truncated client context at ${limit} characters, and the research pipeline could not complete with the data that remained. The missing earlier text was not invented. Retry with a shorter paste, or upgrade for a larger client context with compression and recursive inspect (RLM).`;
  }
  if (signal.truncated) {
    return `Free soft-truncated this thread’s client context at ${limit} characters. Text past that limit was not sent, and the missing part was not invented. Retry with a shorter paste, or upgrade for a larger client context with compression and recursive inspect (RLM).`;
  }
  if (signal.pipeline) {
    return 'The research pipeline could not complete with the data Free can hold. Earlier context was not reconstructed. Retry with a shorter paste, or upgrade — Premium keeps a larger client context and can compress or recursively inspect (RLM) longer dossiers.';
  }
  return CONTEXT_UPGRADE_COPY.body;
}
