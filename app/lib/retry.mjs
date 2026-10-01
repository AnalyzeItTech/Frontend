// Retry helper for the first requests after the API (Render) or Model (Azure, scale-to-zero)
// wakes from sleep: connection errors and 502/503/504 are transient; everything else is final.

export const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * @param {() => Promise<Response>} attempt  performs one request
 * @param {{ retries?: number, baseDelayMs?: number, sleep?: (ms:number)=>Promise<void> }} [opts]
 * @returns {Promise<Response>}
 */
export async function withRetry(attempt, opts = {}) {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 1500;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  let lastError;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await attempt();
      if (!RETRYABLE_STATUS.has(res.status) || i === retries) return res;
    } catch (err) {
      // A deliberate abort/timeout is not a cold-start symptom: surface it immediately.
      if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) throw err;
      lastError = err;
      if (i === retries) throw err;
    }
    await sleep(baseDelayMs * (i + 1));
  }
  throw lastError ?? new Error('Request failed');
}
