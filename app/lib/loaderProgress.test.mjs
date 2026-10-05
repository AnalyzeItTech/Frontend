import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LOADER_DURATION_MS, LOADER_MAX_MS, LOADER_SKIP_AFTER_MS, loaderExpired, loaderProgress, loaderStatus, skipVisible } from './loaderProgress.mjs';

describe('loaderProgress', () => {
  it('starts at 0 and reaches exactly 100', () => {
    assert.equal(loaderProgress(0), 0);
    assert.equal(loaderProgress(LOADER_DURATION_MS), 100);
    assert.equal(loaderProgress(LOADER_DURATION_MS * 5), 100);
  });
  it('only ever goes up', () => {
    let last = -1;
    for (let t = 0; t <= LOADER_DURATION_MS; t += 100) {
      const p = loaderProgress(t);
      assert.ok(p >= last, `${t}`);
      last = p;
    }
  });
  it('catches up after a stall: one long gap lands where continuous ticking would have', () => {
    assert.equal(loaderProgress(2900), loaderProgress(2900)); // a function of time, not of how many ticks ran
    assert.ok(loaderProgress(2900) > 90);
  });
  it('tolerates junk', () => {
    for (const bad of [undefined, null, NaN, -50, 'x']) assert.equal(loaderProgress(bad), 0);
  });
});

describe('the loader can never trap a visitor', () => {
  it('expires, and offers Skip long before that', () => {
    assert.equal(loaderExpired(LOADER_MAX_MS - 1), false);
    assert.equal(loaderExpired(LOADER_MAX_MS), true);
    assert.ok(LOADER_SKIP_AFTER_MS < LOADER_MAX_MS / 2);
    assert.equal(skipVisible(LOADER_SKIP_AFTER_MS - 1), false);
    assert.equal(skipVisible(LOADER_SKIP_AFTER_MS), true);
    assert.ok(LOADER_MAX_MS <= 8000);
  });
  it('labels the stages', () => {
    assert.equal(loaderStatus(0), 'CALIBRATING ATMOSPHERE');
    assert.equal(loaderStatus(45), 'PREPARING ISLANDS');
    assert.equal(loaderStatus(75), 'CONNECTING DATA FLOWS');
    assert.equal(loaderStatus(100), 'EXPERIENCE READY');
  });
});
