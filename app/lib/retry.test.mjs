import test from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from './retry.mjs';

const res = (status) => ({ status });
const noSleep = async () => {};

test('returns immediately on success', async () => {
  let calls = 0;
  const out = await withRetry(async () => { calls += 1; return res(200); }, { sleep: noSleep });
  assert.equal(out.status, 200);
  assert.equal(calls, 1);
});

test('retries cold-start statuses then succeeds', async () => {
  const seq = [503, 502, 200];
  let calls = 0;
  const out = await withRetry(async () => res(seq[calls++]), { sleep: noSleep });
  assert.equal(out.status, 200);
  assert.equal(calls, 3);
});

test('does not retry client errors or auth failures', async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    let calls = 0;
    const out = await withRetry(async () => { calls += 1; return res(status); }, { sleep: noSleep });
    assert.equal(out.status, status);
    assert.equal(calls, 1, `status ${status}`);
  }
});

test('returns the last retryable response when retries are exhausted', async () => {
  let calls = 0;
  const out = await withRetry(async () => { calls += 1; return res(503); }, { retries: 2, sleep: noSleep });
  assert.equal(out.status, 503);
  assert.equal(calls, 3);
});

test('retries network errors but rethrows after the last attempt', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; throw new TypeError('Failed to fetch'); }, { retries: 1, sleep: noSleep }),
    /Failed to fetch/,
  );
  assert.equal(calls, 2);
});

test('does not retry aborts/timeouts', async () => {
  let calls = 0;
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  await assert.rejects(withRetry(async () => { calls += 1; throw abort; }, { sleep: noSleep }));
  assert.equal(calls, 1);
});

test('backs off with increasing delays', async () => {
  const delays = [];
  await withRetry(async () => res(503), { retries: 2, baseDelayMs: 100, sleep: async (ms) => { delays.push(ms); } });
  assert.deepEqual(delays, [100, 200]);
});
