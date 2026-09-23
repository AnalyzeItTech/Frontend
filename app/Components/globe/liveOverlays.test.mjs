/**
 * Regression tests for globe overlay selection independence (bug #7).
 * Run: node --test app/Components/globe/liveOverlays.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildLiveOverlays,
  mergeDisplayPoints,
  overlaysContainPlaceContextExtras,
  selectionLoadsPlaceContext,
} from './liveOverlays.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pageSource = fs.readFileSync(path.join(__dirname, '../../globe/page.tsx'), 'utf8');

describe('bug #7 — overlay build ignores place selection/context', () => {
  it('maps flights + iss without place-context extras even when payloads are rich', () => {
    const { points, paths, counts } = buildLiveOverlays(
      { flights: true, iss: true, weather: false },
      {
        flights: {
          events: [
            {
              id: 'a1',
              lat: 40.1,
              lon: -74.2,
              callsign: 'UAL1',
              track_deg: 90,
              altitude_m: 10000,
              velocity_ms: 220,
              squawk: '1234',
              origin_country: 'United States',
              on_ground: false,
              last_seen: 1700000000,
              vertical_rate_ms: 1.5,
              aircraft_desc: 'BOEING 737-800',
              route_available: false,
            },
            { id: 'a2', lat: 51.5, lon: -0.1, callsign: 'BAW2', track_deg: 180 },
          ],
        },
        iss: {
          events: [
            { id: 'iss-now', lat: 12, lon: 34, type: 'iss', norad_id: 25544, label: 'ISS' },
            { id: 'sat:1', lat: 1, lon: 2, type: 'satellite', name: 'SAT' },
          ],
          path: [
            { lat: 10, lon: 20 },
            { lat: 11, lon: 21 },
          ],
        },
        // Would have been mixed in pre-fix — must be ignored (weather layer off + no selected API)
        weather: {
          events: [{ id: 'selected:nyc', lat: 40.7, lon: -74, place: 'NYC weather' }],
        },
      },
    );

    assert.equal(counts.flights, 2);
    assert.equal(counts.iss, 2);
    assert.equal(counts.weather, undefined);
    assert.equal(points.length, 4);
    assert.ok(points.every((p) => p.kind === 'event'));
    assert.ok(points.every((p) => p.id.startsWith('flights:') || p.id.startsWith('iss:')));
    assert.equal(overlaysContainPlaceContextExtras(points), false);
    assert.equal(paths.length, 1);
    assert.equal(paths[0].id, 'iss-orbit');
    assert.deepEqual(paths[0].coordinates[0], [20, 10]);

    const flight = points.find((p) => p.id === 'flights:a1');
    assert.ok(flight);
    assert.equal(flight.meta.squawk, '1234');
    assert.equal(flight.meta.origin_country, 'United States');
    assert.equal(flight.meta.on_ground, false);
    assert.equal(flight.meta.aircraft_desc, 'BOEING 737-800');
    assert.equal(flight.meta.route_available, false);
    assert.equal(flight.meta.vertical_rate_ms, 1.5);
    assert.equal(flight.trackDeg, 90);
  });

  it('never emits legacy place-context overlay id shapes', () => {
    const { points } = buildLiveOverlays(
      { flights: true, iss: true, weather: true, markets: true },
      {
        flights: { events: [{ id: 'f1', lat: 1, lon: 2, callsign: 'X' }] },
        iss: { events: [{ id: 'iss-now', lat: 3, lon: 4, type: 'iss', norad_id: 25544 }] },
        weather: { events: [{ id: 'w1', lat: 5, lon: 6, place: 'Hub' }] },
        markets: { events: [{ id: 'm1', lat: 7, lon: 8, place: 'Hub' }] },
      },
    );
    assert.equal(overlaysContainPlaceContextExtras(points), false);
    assert.ok(!points.some((p) => /selected|ctx/.test(p.id)));
  });

  it('buildLiveOverlays function arity does not accept selected/context', () => {
    assert.equal(buildLiveOverlays.length, 2);
  });
});

describe('bug #7 — selection routing', () => {
  it('overlay event selection skips place context', () => {
    assert.equal(
      selectionLoadsPlaceContext({
        lat: 1,
        lon: 2,
        name: 'ISS',
        event: { id: 'iss:iss-now', lat: 1, lon: 2, label: 'ISS', kind: 'event' },
      }),
      false,
    );
  });

  it('bare place selection loads place context', () => {
    assert.equal(selectionLoadsPlaceContext({ lat: 1, lon: 2, name: 'Paris' }), true);
    assert.equal(selectionLoadsPlaceContext({ lat: 1, lon: 2 }), true);
  });
});

describe('displayPoints merge', () => {
  it('dedupes by id with catalog winning over overlays', () => {
    const catalog = [{ id: 'same', lat: 0, lon: 0, label: 'catalog', kind: 'archive' }];
    const active = [{ id: 'chat', lat: 1, lon: 1, label: 'chat', kind: 'live' }];
    const overlays = [
      { id: 'same', lat: 9, lon: 9, label: 'overlay', kind: 'event' },
      { id: 'flight:1', lat: 2, lon: 2, label: 'AC', kind: 'event' },
    ];
    const merged = mergeDisplayPoints(catalog, active, overlays);
    assert.equal(merged.length, 3);
    assert.equal(merged.find((p) => p.id === 'same')?.label, 'catalog');
    assert.ok(merged.some((p) => p.id === 'flight:1'));
    assert.ok(merged.some((p) => p.id === 'chat'));
  });
});

describe('bug #7 — source invariants in globe/page.tsx', () => {
  it('overlay poll effect deps exclude selected and context', () => {
    const match = pageSource.match(
      /void buildOverlays\(\);\s*const timer = window\.setInterval\(\(\) => \{\s*void buildOverlays\(\);\s*\}, LIVE_LAYER_POLL_MS\);\s*return \(\) => \{[\s\S]*?\};\s*\}, \[([^\]]+)\]\);/,
    );
    assert.ok(match, 'expected overlay poll useEffect dependency array');
    const deps = match[1];
    assert.ok(!/\bselected\b/.test(deps), `deps must not include selected: ${deps}`);
    assert.ok(!/\bcontext\b/.test(deps), `deps must not include context: ${deps}`);
    assert.ok(/\blayers\b/.test(deps), `deps must include layers: ${deps}`);
  });

  it('uses buildLiveOverlays and selectionLoadsPlaceContext helpers', () => {
    assert.ok(pageSource.includes('buildLiveOverlays('));
    assert.ok(pageSource.includes('selectionLoadsPlaceContext('));
    assert.ok(!pageSource.includes('weather:selected'));
    assert.ok(!pageSource.includes('flight:ctx'));
    assert.ok(!pageSource.includes('iss:ctx'));
  });

  it('does not offer a flights globe layer', () => {
    assert.doesNotMatch(pageSource, /id: 'flights'/);
    assert.doesNotMatch(pageSource, /OpenSky\/ADS-B/);
  });
});
