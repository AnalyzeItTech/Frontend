import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deviceTier, tierSettings } from './deviceTier.mjs';

describe('deviceTier', () => {
  it('treats a laptop as standard', () => {
    assert.equal(deviceTier({ cores: 8, memoryGb: 8 }), 'standard');
  });
  it('treats few cores, little memory, data saver or reduced motion as low', () => {
    assert.equal(deviceTier({ cores: 4, memoryGb: 8 }), 'low');
    assert.equal(deviceTier({ cores: 8, memoryGb: 2 }), 'low');
    assert.equal(deviceTier({ cores: 8, memoryGb: 8, saveData: true }), 'low');
    assert.equal(deviceTier({ cores: 8, memoryGb: 8, reducedMotion: true }), 'low');
  });
  it('assumes a narrow screen with no hardware info is a phone', () => {
    assert.equal(deviceTier({ narrow: true }), 'low');
    assert.equal(deviceTier({ narrow: false }), 'standard');
    assert.equal(deviceTier({ narrow: true, cores: 8, memoryGb: 8 }), 'standard');
  });
  it('low tier draws less', () => {
    const low = tierSettings('low');
    const std = tierSettings('standard');
    assert.ok(low.maxPixelRatio < std.maxPixelRatio);
    assert.ok(low.tileCache < std.tileCache);
    assert.equal(low.fadeMs, 0);
    assert.equal(low.idleDrift, false);
  });
});
