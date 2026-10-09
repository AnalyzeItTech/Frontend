import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deliveryLine, digestStatusLine, runNowMessage } from './digestView.mjs';

const future = new Date(Date.now() + 3 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

test('the panel says what state it is in, in plain words', () => {
  assert.match(digestStatusLine({ enabled: false, next_run_at: null, last_status: null }), /^Off\./);
  assert.match(digestStatusLine({ enabled: true, next_run_at: future, last_status: 'ok' }), /The last digest was made\. The next check is next on /);
  assert.match(digestStatusLine({ enabled: true, next_run_at: past, last_status: null }), /^On\. The next check is due now\./);
  assert.match(digestStatusLine({ enabled: true, next_run_at: future, last_status: 'needs_ai_access' }), /not allowed to read this project/);
  assert.match(digestStatusLine({ enabled: true, next_run_at: future, last_status: 'failed' }), /will try again/);
  assert.equal(digestStatusLine(null), '');
});

test('delivery is described as queued, never as delivered', () => {
  assert.equal(deliveryLine({ email: 'queued', slack: 'queued' }), 'email queued, Slack queued');
  assert.equal(deliveryLine({ email: 'queued' }), 'email queued');
  assert.equal(deliveryLine({}), 'in the app only');
  assert.equal(deliveryLine(null), 'in the app only');
  assert.ok(!/sent|delivered/.test(deliveryLine({ email: 'queued', slack: 'queued' })));
});

test('making one now answers every outcome', () => {
  assert.equal(runNowMessage({ status: 'ok' }), 'Made a new digest.');
  assert.match(runNowMessage({ status: 'needs_ai_access' }), /Allow the assistant/);
  assert.match(runNowMessage({ status: 'no_data' }), /no data/);
  assert.match(runNowMessage({ status: 'failed' }), /Try again/);
  assert.match(runNowMessage(null, { status: 429 }), /less than an hour ago/);
  assert.equal(runNowMessage(null, { status: 500, message: 'Boom' }), 'Boom');
});

test('the panel is on the connectors screen, the digest page is private, and a webhook is never shown back', () => {
  assert.match(readFileSync(new URL('../Components/dashboard/ConnectorsView.tsx', import.meta.url), 'utf8'), /<DigestPanel projectId=\{projectId\}/);
  assert.match(readFileSync(new URL('../../proxy.ts', import.meta.url), 'utf8'), /'\/digest'/);
  assert.match(readFileSync(new URL('../robots.ts', import.meta.url), 'utf8'), /'\/digest'/);
  const panel = readFileSync(new URL('../Components/dashboard/DigestPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /type="password"/);
  assert.doesNotMatch(panel, /settings\.slack_webhook/);
});
