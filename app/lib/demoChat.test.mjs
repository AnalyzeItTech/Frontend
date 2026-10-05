import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEMO_EXAMPLES, explainDemoFailure, parseDemoStream, toolLabel, triesLabel, zeroTokenToolFromRoute } from './demoChat.mjs';

describe('the examples', () => {
  it('are short and are the kinds of ask the Backend answers without an account', () => {
    const rx = /weather|calculate|compute|\d+\s*[*+\-/]\s*\d+|\b(usd|eur|inr|gbp)\b.*\b(to|in)\b|\b(stock|share price|ticker|quote)\b/i;
    for (const { label, question } of DEMO_EXAMPLES) {
      assert.ok(label.length < 30 && question.length <= 240, label);
      assert.match(question, rx, question);
    }
    assert.equal(DEMO_EXAMPLES.length, 4);
  });
});

describe('zeroTokenToolFromRoute', () => {
  it('latches only a success route', () => {
    assert.equal(zeroTokenToolFromRoute('zero_token_tool:weather_lookup'), 'weather_lookup');
    assert.equal(zeroTokenToolFromRoute('zero_token_tool_failed:weather_lookup'), null);
    for (const bad of [undefined, null, 'agent', 'zero_token_tool:', 42]) assert.equal(zeroTokenToolFromRoute(bad), null);
  });
});

describe('parseDemoStream', () => {
  const ok = [
    { event: 'route_decision', payload: { route: 'zero_token_tool:currency_converter', reason: 'zero_token_tool:currency_converter' } },
    { event: 'final', payload: { text: ' 100 USD = 8,312 INR ', sources: [{ host: 'open.er-api.com', url: 'https://open.er-api.com', verified: true }], usage: { zero_token: true } } },
  ];
  it('reads a tool answer with its badge and sources', () => {
    const r = parseDemoStream(ok);
    assert.equal(r.answer, '100 USD = 8,312 INR');
    assert.equal(r.zeroTool, 'currency_converter');
    assert.deepEqual(r.sources.map((s) => s.host), ['open.er-api.com']);
    assert.equal(r.error, null);
  });
  it('never shows the success badge after a failed tool', () => {
    const r = parseDemoStream([
      { event: 'route_decision', payload: { route: 'zero_token_tool:weather_lookup' } },
      { event: 'tool_result', payload: { tool: 'weather_lookup', ok: false } },
      { event: 'final', payload: { text: 'I could not find that city.', usage: { zero_token: true } } },
    ]);
    assert.equal(r.zeroTool, null);
    assert.equal(r.failedTool, 'weather_lookup');
    assert.equal(r.answer, 'I could not find that city.');
  });
  it('carries stream errors and tolerates junk', () => {
    assert.deepEqual(parseDemoStream([{ event: 'error', payload: { code: 'AGENT_BUSY', message: 'busy' } }]).error, { code: 'AGENT_BUSY', message: 'busy' });
    assert.deepEqual(parseDemoStream(undefined).sources, []);
    assert.equal(parseDemoStream([null, {}, { event: 'final' }]).answer, '');
  });
  it('joins a list-shaped text payload and caps sources', () => {
    const r = parseDemoStream([{ event: 'final', payload: { text: [{ text: 'a' }, 'b'], sources: Array.from({ length: 12 }, (_, i) => ({ host: `h${i}` })) } }]);
    assert.equal(r.answer, 'ab');
    assert.equal(r.sources.length, 6);
  });
});

describe('explainDemoFailure', () => {
  it('names each situation plainly', () => {
    assert.equal(explainDemoFailure(429, { code: 'GUEST_TRIES_USED' }).kind, 'limit');
    assert.equal(explainDemoFailure(401, { code: 'AUTH_REQUIRED' }).kind, 'needs_account');
    assert.match(explainDemoFailure(401, {}).message, /weather, currency, stock or math/);
    for (const s of [0, 502, 503, 504]) assert.equal(explainDemoFailure(s, null).kind, 'unavailable');
    assert.equal(explainDemoFailure(500, { message: 'Boom' }).message, 'Boom');
    assert.equal(explainDemoFailure(500, null).kind, 'error');
  });
});

describe('labels', () => {
  it('reads naturally', () => {
    assert.equal(toolLabel('weather_lookup'), 'weather');
    assert.equal(toolLabel('some_new_tool'), 'some new tool');
    assert.equal(triesLabel(5, 5), '5 of 5 free tries left today');
    assert.equal(triesLabel(1, 5), '1 of 5 free try left today');
    assert.equal(triesLabel(0, 5), 'No free tries left today');
    assert.equal(triesLabel(NaN, 5), '');
  });
});
