/**
 * View helpers for globe chrome. Run: node --test app/Components/globe/globeVisual.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layerCountLabel } from './dataQuality.mjs';
import {
  globeAtmosphere,
  globeBasemapTheme,
  layerHealthView,
  researchAtmosphere,
} from './globeVisual.mjs';

function rgbChannels(value) {
  const match = String(value).match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  assert.ok(match, `expected rgb(), got ${value}`);
  return match.slice(1).map(Number);
}

describe('research basemap and atmosphere', () => {
  it('uses a dark basemap on the full globe in either app theme', () => {
    assert.equal(globeBasemapTheme({ variant: 'full', appTheme: 'light' }), 'dark');
    assert.equal(globeBasemapTheme({ variant: 'full', appTheme: 'dark' }), 'dark');
  });

  it('lets the mini globe follow the app theme', () => {
    assert.equal(globeBasemapTheme({ variant: 'mini', appTheme: 'light' }), 'streets');
    assert.equal(globeBasemapTheme({ variant: 'mini', appTheme: 'dark' }), 'dark');
  });

  it('keeps the full-globe limb dim and the space nearly black', () => {
    const { fog, light } = researchAtmosphere();
    const space = rgbChannels(fog['space-color']);
    const haze = rgbChannels(fog.color);
    const rim = rgbChannels(fog['high-color']);
    assert.ok(space.every((channel) => channel <= 16), `space too bright: ${fog['space-color']}`);
    assert.ok(haze.every((channel) => channel <= 40), `haze too bright: ${fog.color}`);
    assert.ok(rim[2] < 120, `rim reads as sky blue: ${fog['high-color']}`);
    assert.ok(fog['star-intensity'] <= 0.25);
    assert.ok(light.intensity <= 0.35);
    assert.deepEqual(globeAtmosphere({ variant: 'full', appTheme: 'light' }), researchAtmosphere());
  });

  it('does not restyle the light mini globe atmosphere', () => {
    const mini = globeAtmosphere({ variant: 'mini', appTheme: 'light' });
    assert.equal(mini.fog.color, 'rgb(168, 204, 236)');
    assert.equal(mini.fog['star-intensity'], 0);
    assert.equal(mini.light.intensity, 0.55);
  });
});

describe('layer health chrome', () => {
  it('matches layerCountLabel and never prints 0 for a failed fetch', () => {
    const cases = [
      [0, { status: 'error' }, 'unavailable', 'unavailable'],
      [4, { status: 'stale' }, '4 stale', 'stale'],
      [0, { status: 'stale' }, 'unavailable', 'unavailable'],
      [0, { status: 'empty' }, '0', 'zero'],
      [12, { status: 'ok' }, '12', 'count'],
      [3, { status: 'loading' }, '…', 'loading'],
      [0, undefined, '0', 'zero'],
    ];
    for (const [count, health, label, tone] of cases) {
      const view = layerHealthView(count, health);
      assert.equal(view.label, layerCountLabel(count, health));
      assert.equal(view.label, label);
      assert.equal(view.tone, tone);
    }
  });
});
