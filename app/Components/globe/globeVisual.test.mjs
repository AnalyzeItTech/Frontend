/**
 * View helpers for globe chrome. Run: node --test app/Components/globe/globeVisual.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layerCountLabel } from './dataQuality.mjs';
import {
  LIGHT_SPACE_COLOR,
  LIGHT_STAGE_BG,
  RESEARCH_STAGE_BG,
  globeAtmosphere,
  globeBasemapTheme,
  globeStage,
  layerHealthView,
  lightAtmosphere,
  researchAtmosphere,
} from './globeVisual.mjs';

function rgbChannels(value) {
  const match = String(value).match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  assert.ok(match, `expected rgb(), got ${value}`);
  return match.slice(1).map(Number);
}

describe('theme-aware basemap and atmosphere', () => {
  it('uses streets tiles and a light stage on the full globe in light theme', () => {
    assert.equal(globeBasemapTheme({ variant: 'full', appTheme: 'light' }), 'streets');
    const stage = globeStage({ variant: 'full', appTheme: 'light' });
    assert.equal(stage.research, false);
    assert.equal(stage.background, LIGHT_STAGE_BG);
    assert.notEqual(stage.background, RESEARCH_STAGE_BG);
    assert.equal(stage.canvasClass, 'globe-map-canvas--light');
    assert.equal(stage.pageClass, 'globe-page-stage globe-page-stage--light');

    const { fog, light } = globeAtmosphere({ variant: 'full', appTheme: 'light' });
    assert.deepEqual(globeAtmosphere({ variant: 'full', appTheme: 'light' }), lightAtmosphere({ mini: false }));
    assert.equal(fog.color, 'rgb(168, 204, 236)');
    assert.equal(fog['high-color'], 'rgb(56, 118, 232)');
    assert.equal(fog['space-color'], LIGHT_SPACE_COLOR);
    assert.equal(fog['star-intensity'], 0);
    assert.equal(light.color, '#fff4e8');
    assert.equal(light.intensity, 0.55);
    const space = rgbChannels(fog['space-color']);
    const rim = rgbChannels(fog['high-color']);
    assert.ok(space.every((channel) => channel >= 200), `stage space is not light: ${fog['space-color']}`);
    assert.ok(rim[2] > 180, `limb is not the light blue rim: ${fog['high-color']}`);
    assert.notDeepEqual(fog, researchAtmosphere().fog);
  });

  it('keeps the dark research stage on the full globe in dark theme', () => {
    assert.equal(globeBasemapTheme({ variant: 'full', appTheme: 'dark' }), 'dark');
    const stage = globeStage({ variant: 'full', appTheme: 'dark' });
    assert.equal(stage.research, true);
    assert.equal(stage.background, RESEARCH_STAGE_BG);
    assert.equal(stage.background, '#07090c');
    assert.equal(stage.canvasClass, 'globe-map-canvas--research');

    const { fog, light } = researchAtmosphere();
    const space = rgbChannels(fog['space-color']);
    const haze = rgbChannels(fog.color);
    const rim = rgbChannels(fog['high-color']);
    assert.ok(space.every((channel) => channel <= 16), `space too bright: ${fog['space-color']}`);
    assert.ok(haze.every((channel) => channel <= 40), `haze too bright: ${fog.color}`);
    assert.ok(rim[2] < 120, `rim reads as sky blue: ${fog['high-color']}`);
    assert.ok(fog['star-intensity'] > 0 && fog['star-intensity'] <= 0.25);
    assert.ok(light.intensity <= 0.35);
    assert.deepEqual(globeAtmosphere({ variant: 'full', appTheme: 'dark' }), researchAtmosphere());
  });

  it('lets the mini globe follow the app theme', () => {
    assert.equal(globeBasemapTheme({ variant: 'mini', appTheme: 'light' }), 'streets');
    assert.equal(globeBasemapTheme({ variant: 'mini', appTheme: 'dark' }), 'dark');
    assert.equal(globeStage({ variant: 'mini', appTheme: 'light' }).canvasClass, '');
    assert.equal(globeStage({ variant: 'mini', appTheme: 'dark' }).research, false);
  });

  it('does not restyle the light mini globe atmosphere', () => {
    const mini = globeAtmosphere({ variant: 'mini', appTheme: 'light' });
    assert.deepEqual(mini, lightAtmosphere({ mini: true }));
    assert.equal(mini.fog.color, 'rgb(168, 204, 236)');
    assert.equal(mini.fog['high-color'], 'rgb(56, 118, 232)');
    assert.equal(mini.fog['space-color'], 'rgb(8, 10, 26)');
    assert.equal(mini.fog['star-intensity'], 0);
    assert.equal(mini.light.intensity, 0.55);
  });

  it('does not restyle the dark mini globe atmosphere', () => {
    const mini = globeAtmosphere({ variant: 'mini', appTheme: 'dark' });
    assert.equal(mini.fog.color, 'rgb(18, 28, 52)');
    assert.equal(mini.fog['high-color'], 'rgb(64, 110, 210)');
    assert.equal(mini.fog['star-intensity'], 0);
    assert.equal(mini.light.intensity, 0.42);
    assert.notDeepEqual(mini, researchAtmosphere());
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
