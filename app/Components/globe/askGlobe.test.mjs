import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { activeLayerSummary, askSuggestions, clampAnswer, globeAskMessage } from './askGlobe.mjs';

const state = {
  selected: { lat: 19.07, lon: 72.87, name: 'Mumbai', country: 'India' },
  compare: [{ lat: 19.07, lon: 72.87, name: 'Mumbai' }, { lat: 51.5, lon: -0.12, name: 'London' }],
  layers: { earthquakes: true, wildfires: false, my_data: true, markets: true },
  layerCounts: { earthquakes: 120, my_data: 7, markets: 0 },
  days: 3,
};

describe('Ask the globe context', () => {
  it('lists only layers that are on and have pins', () => {
    assert.deepEqual(activeLayerSummary(state.layers, state.layerCounts).map((l) => l.id), ['earthquakes', 'my_data']);
  });

  it('describes the view and pins places once each', () => {
    const msg = globeAskMessage('What is happening here?', state);
    assert.match(msg, /^What is happening here\?/);
    assert.match(msg, /Mumbai, India @ 19\.0700, 72\.8700/);
    assert.equal((msg.match(/Mumbai/g) || []).length, 1);
    assert.match(msg, /London/);
    assert.match(msg, /Earthquakes \(120\), My data \(7\), last 3 days/);
    assert.match(msg, /own project records/);
    assert.match(msg, /fly to them/);
  });

  it('works with nothing selected', () => {
    const msg = globeAskMessage('', { layers: {}, layerCounts: {} });
    assert.match(msg, /^What should I look at/);
    assert.doesNotMatch(msg, /Layers on the map/);
  });
});

describe('suggestions', () => {
  it('follow the selection and layers, max 4', () => {
    const s = askSuggestions(state);
    assert.ok(s.length <= 4);
    assert.match(s[0], /^Compare Mumbai and London/);
    assert.ok(s.some((x) => /earthquakes/.test(x)));
  });

  it('offer defaults on an empty globe', () => {
    assert.ok(askSuggestions({}).length >= 2);
  });
});

describe('clampAnswer', () => {
  it('truncates only very long text', () => {
    assert.equal(clampAnswer('short'), 'short');
    assert.ok(clampAnswer('x'.repeat(7000)).length <= 6001);
  });
});
