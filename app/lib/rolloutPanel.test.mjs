import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { allowAccountBody, removeAccountBody, statusLook, validAccountId } from './rolloutPanel.mjs';

describe('allowAccountBody', () => {
  it('tries one account while the flag stays off for everyone else', () => {
    assert.deepEqual(allowAccountBody(undefined, 'u1'), { enabled: false, tiers: [], allow_users: ['u1'], deny_users: [] });
    assert.deepEqual(allowAccountBody({ enabled: false }, ' u1 '), { enabled: false, tiers: [], allow_users: ['u1'], deny_users: [] });
  });
  it('keeps who else the flag already covers', () => {
    const rule = { enabled: true, tiers: ['premium_plus'], percent: 10, allow_users: ['a'], deny_users: ['z'] };
    assert.deepEqual(allowAccountBody(rule, 'b'), { enabled: true, tiers: ['premium_plus'], percent: 10, allow_users: ['a', 'b'], deny_users: ['z'] });
  });
  it('does not add the same account twice, or mutate the rule it was given', () => {
    const rule = { enabled: false, allow_users: ['a'] };
    assert.deepEqual(allowAccountBody(rule, 'a').allow_users, ['a']);
    allowAccountBody(rule, 'b');
    assert.deepEqual(rule.allow_users, ['a']);
  });
  it('an empty id adds nothing', () => {
    assert.deepEqual(allowAccountBody({ allow_users: ['a'] }, '   ').allow_users, ['a']);
  });
});

describe('removeAccountBody', () => {
  it('takes one account off and leaves the rest', () => {
    assert.deepEqual(removeAccountBody({ enabled: false, allow_users: ['a', 'b'] }, 'a').allow_users, ['b']);
    assert.deepEqual(removeAccountBody({ enabled: true, allow_users: ['a'] }, 'nobody').allow_users, ['a']);
  });
});

describe('statusLook and validAccountId', () => {
  it('maps each status to a mark', () => {
    assert.equal(statusLook('ok').mark, '✓');
    assert.equal(statusLook('todo').label, 'needs action');
    assert.equal(statusLook('anything else').mark, '!');
  });
  it('accepts a plain id and rejects blanks, spaces and huge input', () => {
    assert.equal(validAccountId('80e8688f-0ff0'), true);
    for (const bad of ['', '   ', 'a b', 'x'.repeat(81), null, undefined]) assert.equal(validAccountId(bad), false);
  });
});
