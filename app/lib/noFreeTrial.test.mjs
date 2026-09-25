/**
 * Free Premium trial is removed from the client.
 * Run: node --test app/lib/noFreeTrial.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|jsx|js|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe('no free Premium trial in the client', () => {
  it('does not call or offer a trial start', () => {
    const billing = read('app/billing/page.tsx');
    const api = read('app/lib/billingApi.ts');
    assert.equal(billing.includes('startTrial'), false);
    assert.equal(billing.includes('Start free trial'), false);
    assert.equal(billing.includes('trialEligible'), false);
    assert.equal(billing.includes('trialActive'), false);
    assert.equal(api.includes('/trial/start'), false);
    assert.equal(api.includes('function startTrial'), false);
  });

  it('does not special-case free_trial for the quota chip', () => {
    const quota = read('app/lib/llmQuota.ts');
    assert.equal(quota.includes('free_trial'), false);
  });

  it('keeps paid checkout and cancel helpers', () => {
    const api = read('app/lib/billingApi.ts');
    const billing = read('app/billing/page.tsx');
    assert.match(api, /function startCheckout/);
    assert.match(api, /function cancelSubscription/);
    assert.match(api, /function getBillingQuote/);
    assert.match(billing, /Pay with Razorpay/);
    assert.match(billing, /confirmRazorpay/);
  });

  it('has no user-facing free-trial CTA copy in app sources', () => {
    const banned = [
      'Start free trial',
      'Try Premium free',
      'Premium trial',
      'No card required',
      '/trial/start',
    ];
    const hits = [];
    for (const file of walk(path.join(root, 'app'))) {
      if (file.endsWith('noFreeTrial.test.mjs')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const phrase of banned) {
        if (text.includes(phrase)) hits.push(`${path.relative(root, file)}: ${phrase}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
