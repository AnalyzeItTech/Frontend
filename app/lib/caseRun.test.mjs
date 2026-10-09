import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainCaseFailure, initialRun, parseCaseLine, reduceRun, stepsFromActivity } from './caseRun.mjs';

const online = JSON.parse(readFileSync(new URL('./fixtures/findings.online.json', import.meta.url), 'utf8'));
const line = (event, payload) => JSON.stringify({ v: 1, event, payload });

test('a whole run folds into: steps filling in, then the answer, then a link', () => {
  const lines = [
    line('case_started', { title: "India's GDP growth", question: 'What stands out?', source: 'World Bank' }),
    line('tool_progress', { tool: 'data_discovery', mode: 'online', step: 'find', state: 'done', candidates: 3, sources: ['api.worldbank.org'] }),
    line('tool_progress', { tool: 'data_discovery', mode: 'online', step: 'fetch', state: 'running', host: 'api.worldbank.org', done: 0, total: 1 }),
    line('tool_progress', { tool: 'data_discovery', mode: 'online', step: 'clean', state: 'done', tables: 1, rows: 64 }),
    line('final', { text: 'GDP fell in 2020.', findings: online, route: 'online_discovery' }),
    line('case_saved', { token: 'x', path: '/case/AbCdEfGhIjKlMn', expires_at: '2026-11-05T00:00:00+00:00' }),
  ];
  let s = initialRun;
  const seen = [];
  for (const l of lines) {
    s = reduceRun(s, parseCaseLine(l));
    seen.push(s.status);
  }
  assert.deepEqual(seen, ['running', 'running', 'running', 'running', 'answered', 'answered']);
  assert.equal(s.title, "India's GDP growth");
  assert.ok(s.findings && s.findings.findings.length);
  assert.ok(s.steps.every((st) => st.state === 'done'));
  assert.equal(s.saved.path, '/case/AbCdEfGhIjKlMn');
  const find = s.steps.find((st) => st.id === 'find');
  assert.match(find.detail, /3 possible sources/);
});

test('the steps are the online ones: find, download, read', () => {
  const s = reduceRun(initialRun, parseCaseLine(line('case_started', { title: 't', question: 'q', source: 's' })));
  assert.deepEqual(s.steps.map((x) => x.id).slice(0, 3), ['find', 'fetch', 'clean']);
  assert.ok(s.steps.every((x) => x.state === 'pending'));
});

test('lines that are not events, or are not ours, are ignored', () => {
  for (const bad of ['', 'not json', '{}', '[]', JSON.stringify({ event: 5 }), line('thinking', { text: 'x' }), line('route_decision', {})]) {
    assert.equal(parseCaseLine(bad), null, bad);
  }
  assert.equal(reduceRun(initialRun, null), initialRun);
});

test('a share path must be one of our own links, nothing else', () => {
  for (const evil of ['https://evil.example/case/abcdefgh', '//evil.example', '/case/../../x', '/case/short', 'javascript:alert(1)', '/case/abcdefgh?x=1', '/other/AbCdEfGhIjKl']) {
    assert.equal(parseCaseLine(line('case_saved', { path: evil })), null, evil);
  }
  assert.ok(parseCaseLine(line('case_saved', { path: '/case/AbCdEfGhIjKlMnOp' })));
});

test('hostile text is bounded and an unusable result is a clear message', () => {
  const ev = parseCaseLine(line('error', { message: 'x'.repeat(1000) }));
  assert.equal(ev.message.length, 240);
  assert.equal(reduceRun(initialRun, parseCaseLine(line('case_unavailable', {}))).status, 'unavailable');
  assert.match(reduceRun(initialRun, parseCaseLine(line('case_unavailable', {}))).message, /did not give usable data/);
  const bad = parseCaseLine(line('final', { text: 'ok', findings: { version: 99 } }));
  assert.equal(bad.findings, null);
});

test('a saved run shows only the steps it recorded, all finished', () => {
  const steps = stepsFromActivity([
    { step: 'find', state: 'done', candidates: 4, sources: ['api.worldbank.org'] },
    { step: 'fetch', state: 'running', host: 'api.worldbank.org', done: 0, total: 1 },
    { step: 'clean', state: 'done', tables: 1, rows: 64 },
    { step: 'profile', state: 'done', tables: 1 },
    { step: 'analyse', state: 'done', done: 5 },
  ]);
  assert.deepEqual(steps.map((s) => s.id), ['find', 'fetch', 'clean', 'profile', 'analyse']);
  assert.ok(steps.every((s) => s.state === 'done'));
  assert.match(steps[0].detail, /4 possible sources/);
  assert.match(steps[2].detail, /1 table, 64 rows/);
  assert.deepEqual(stepsFromActivity(null), []);
  assert.deepEqual(stepsFromActivity([null, 5, 'x']), []);
});

test('refusals are explained in plain words, and the limit one offers the account', () => {
  assert.equal(explainCaseFailure(429, { message: 'You have run the free cases for now.' }).signup, true);
  assert.equal(explainCaseFailure(503, null).signup, false);
  assert.match(explainCaseFailure(503, null).message, /Try again in a minute/);
  assert.match(explainCaseFailure(0, null).message, /waking up/);
  assert.match(explainCaseFailure(404, null).message, /not available/);
});
