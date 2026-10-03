import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLayerKind, pinDiameter, selectedSourceId, sourcePinFeatures } from './sourcePinsGl.mjs';

const hubs = [{ name: 'Paris', lat: 48.85, lon: 2.35 }, { name: 'Lagos', lat: 6.52, lon: 3.37 }];
const points = [
  { id: 'archive:usgs.gov', lat: 38.9, lon: -77, label: 'USGS', kind: 'archive', tier: 'trusted' },
  { id: 'archive:x.org', lat: 1, lon: 2, label: 'X', kind: 'archive', tier: 'candidate' },
  { id: 'place:1', lat: 5, lon: 5, label: 'Chat pin', kind: 'place' },
  { id: 'e1', lat: 5, lon: 5, label: 'Quake', kind: 'event' },
  { id: 'archive:bad', lat: NaN, lon: 2, label: 'Bad', kind: 'archive' },
];

describe('sourcePinFeatures', () => {
  it('puts hubs and catalog sources in the layer, and leaves chat/event pins as DOM', () => {
    const fc = sourcePinFeatures(hubs, points);
    assert.deepEqual(fc.features.map((f) => f.properties.id), ['hub:Paris', 'hub:Lagos', 'archive:usgs.gov', 'archive:x.org']);
    assert.deepEqual(fc.features[0].geometry.coordinates, [2.35, 48.85]);
  });
  it('sizes match the old pins (radius = diameter / 2)', () => {
    const r = Object.fromEntries(sourcePinFeatures(hubs, points).features.map((f) => [f.properties.id, f.properties.r]));
    assert.equal(r['hub:Paris'], 4.5);
    assert.equal(r['archive:usgs.gov'], 3.5);
    assert.equal(r['archive:x.org'], 2.75);
    assert.equal(pinDiameter({ kind: 'hub' }), 9);
  });
  it('drops duplicates and non-finite coordinates', () => {
    const fc = sourcePinFeatures(hubs, [...points, points[0]]);
    assert.equal(fc.features.filter((f) => f.properties.id === 'archive:usgs.gov').length, 1);
    assert.ok(!fc.features.some((f) => f.properties.id === 'archive:bad'));
  });
  it('only hub and archive are layer kinds', () => {
    assert.deepEqual(['hub', 'archive', 'place', 'live', 'event'].map(isLayerKind), [true, true, false, false, false]);
  });
});

describe('selectedSourceId', () => {
  it('prefers the active hub', () => {
    assert.equal(selectedSourceId({ lat: 1, lon: 2, name: 'X' }, 'Paris', points), 'hub:Paris');
  });
  it('finds the catalog point at the selected place', () => {
    assert.equal(selectedSourceId({ lat: 38.9, lon: -77, name: 'USGS' }, null, points), 'archive:usgs.gov');
    assert.equal(selectedSourceId({ lat: 38.9, lon: -77 }, null, points), 'archive:usgs.gov');
  });
  it('does not highlight a chat pin or nothing', () => {
    assert.equal(selectedSourceId({ lat: 5, lon: 5, name: 'Chat pin' }, null, points), null);
    assert.equal(selectedSourceId(null, null, points), null);
  });
});
