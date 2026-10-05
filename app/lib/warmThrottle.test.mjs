import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WARM_MIN_MS, shouldWarm } from './warmThrottle.mjs';

describe('shouldWarm', () => {
  it('warms on the first open', () => {
    for (const none of [undefined, null, NaN, 'x']) assert.equal(shouldWarm(none, 1_000_000), true);
  });
  it('does not ask again within the window, and does once it has passed', () => {
    const t = 5_000_000;
    assert.equal(shouldWarm(t, t + 1000), false);
    assert.equal(shouldWarm(t, t + WARM_MIN_MS - 1), false);
    assert.equal(shouldWarm(t, t + WARM_MIN_MS), true);
  });
  it('is not stuck off when the clock went backwards', () => {
    assert.equal(shouldWarm(9_000_000, 1_000_000), true);
  });
  it('honours a custom window', () => {
    assert.equal(shouldWarm(1000, 1500, 1000), false);
    assert.equal(shouldWarm(1000, 2000, 1000), true);
  });
});
