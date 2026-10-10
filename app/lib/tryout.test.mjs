import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TRYOUT_EXAMPLES, explainTryoutFailure, formatWait, runsLabel } from './tryout.mjs';

describe('the try-out copy', () => {
  it('says the wait in plain words', () => {
    assert.equal(formatWait(20), 'less than a minute');
    assert.equal(formatWait(60 * 40), 'about 40 minutes');
    assert.equal(formatWait(3600), 'about 1 hour');
    assert.equal(formatWait(86400 - 100), 'about 24 hours');
    assert.equal(formatWait(undefined), 'less than a minute');
  });
  it('counts the runs left', () => {
    assert.equal(runsLabel(5, 5), '5 of 5 try-out runs left');
    assert.equal(runsLabel(1, 5), '1 of 5 try-out run left');
    assert.equal(runsLabel(0, 5), 'All 5 try-out runs used');
    assert.equal(runsLabel(NaN, 5), '');
  });
  it('explains the limit with the cool-down and the way out', () => {
    const f = explainTryoutFailure(429, { code: 'TRYOUT_LIMIT', retry_after_seconds: 7200 });
    assert.equal(f.kind, 'limit');
    assert.match(f.message, /Create a free account/);
    assert.match(f.message, /about 2 hours/);
  });
  it('tells a busy visitor from a full service from a bad question', () => {
    assert.equal(explainTryoutFailure(429, { code: 'TRYOUT_BUSY', message: 'One run at a time.' }).kind, 'busy');
    assert.equal(explainTryoutFailure(503, { code: 'TRYOUT_BUSY' }).kind, 'full');
    const link = explainTryoutFailure(422, { code: 'TRYOUT_LINK', message: 'Ask in plain words, without a link.' });
    assert.equal(link.kind, 'input');
    assert.match(link.message, /without a link/);
    assert.equal(explainTryoutFailure(0, null).kind, 'unavailable');
    assert.equal(explainTryoutFailure(500, null).kind, 'error');
  });
  it('offers only questions that need no link, file or live data', () => {
    for (const ex of TRYOUT_EXAMPLES) {
      assert.ok(ex.question.length <= 400, ex.label);
      assert.doesNotMatch(ex.question, /https?:|www\./i, ex.label);
    }
  });
});
