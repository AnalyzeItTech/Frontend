import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sameKeySet } from './facingSet.mjs';

describe('sameKeySet', () => {
  it('is true for equal contents regardless of order or identity', () => {
    assert.equal(sameKeySet(new Set(['a', 'b']), new Set(['b', 'a'])), true);
    assert.equal(sameKeySet(new Set(), new Set()), true);
  });
  it('is false when anything differs', () => {
    assert.equal(sameKeySet(new Set(['a']), new Set(['a', 'b'])), false);
    assert.equal(sameKeySet(new Set(['a', 'c']), new Set(['a', 'b'])), false);
  });
  it('treats null (flat map, everything visible) as its own state', () => {
    assert.equal(sameKeySet(null, null), true);
    assert.equal(sameKeySet(null, new Set()), false);
    assert.equal(sameKeySet(new Set(), null), false);
  });
});
