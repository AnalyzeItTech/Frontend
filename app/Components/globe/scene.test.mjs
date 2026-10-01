import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeScene, decodeScene, globeLinkForPlaces, eventEpoch, windowBounds, cursorTime, filterByCursor, recency,
} from './scene.mjs';

test('scene round-trips through the URL', () => {
  const scene = {
    layers: ['earthquakes', 'wildfires'], days: 14, view: 'heat', projection: 'mercator',
    places: [{ name: 'São Paulo', lat: -23.55, lon: -46.633 }, { name: 'Hanoi', lat: 21.0285, lon: 105.8542 }],
    camera: { lat: 12.3456, lng: -45.6789, zoom: 3.456 },
  };
  const back = decodeScene(encodeScene(scene));
  assert.deepEqual(back.layers, ['earthquakes', 'wildfires']);
  assert.equal(back.days, 14);
  assert.equal(back.view, 'heat');
  assert.equal(back.projection, 'mercator');
  assert.equal(back.places[0].name, 'São Paulo');
  assert.equal(back.places[1].lat, 21.029);
  assert.deepEqual(back.camera, { lat: 12.346, lng: -45.679, zoom: 3.46 });
});

test('defaults are omitted so links stay short', () => {
  assert.equal(encodeScene({ days: 7, view: 'pins', projection: 'globe' }), '');
  assert.equal(encodeScene({}), '');
});

test('decode rejects everything untrusted', () => {
  const d = decodeScene('?layers=earthquakes,<script>,__proto__,wildfires&days=9999&view=evil&proj=x&places=a@999,0|b@1,2|nope|<x>@3,4&at=1,2');
  assert.deepEqual(d.layers, ['earthquakes', 'wildfires']);
  assert.equal(d.days, null);
  assert.equal(d.view, null);
  assert.equal(d.projection, null);
  assert.deepEqual(d.places.map((p) => p.name), ['b', '<x>']); // out-of-range and malformed dropped; names are data, never markup
  assert.equal(d.camera, null);
  assert.deepEqual(decodeScene(''), { layers: null, days: null, view: null, projection: null, places: [], camera: null });
  assert.equal(decodeScene('?at=95,0,3').camera, null);
});

test('place names cannot break the separators', () => {
  const qs = encodeScene({ places: [{ name: 'A|B@C', lat: 1, lon: 2 }] });
  const back = decodeScene(qs);
  assert.equal(back.places.length, 1);
  assert.equal(back.places[0].lat, 1);
});

test('places are capped', () => {
  const places = Array.from({ length: 20 }, (_, i) => ({ name: `p${i}`, lat: i, lon: i }));
  assert.equal(decodeScene(encodeScene({ places })).places.length, 8);
});

test('globeLinkForPlaces builds a /globe link', () => {
  const link = globeLinkForPlaces([{ name: 'Mumbai', lat: 19.07, lon: 72.87 }]);
  assert.match(link, /^\/globe\?/);
  assert.equal(decodeScene(link.split('?')[1]).places[0].name, 'Mumbai');
  assert.deepEqual(decodeScene(link.split('?')[1]).layers, ['earthquakes', 'disasters']);
  assert.equal(globeLinkForPlaces([], []), '/globe');
});

test('eventEpoch understands ms, seconds and ISO dates', () => {
  assert.equal(eventEpoch({ time: 1_700_000_000_000 }), 1_700_000_000_000);
  assert.equal(eventEpoch({ time: 1_700_000_000 }), 1_700_000_000_000);
  assert.equal(eventEpoch({ date: '2026-10-01T00:00:00Z' }), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(eventEpoch({ date: 'garbage' }), null);
  assert.equal(eventEpoch({ meta: { time: 1_700_000_000_000 } }), 1_700_000_000_000); // real overlay point shape
  assert.equal(eventEpoch({ meta: { date: '2026-10-01T00:00:00Z' } }), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(eventEpoch({ meta: {} }), null);
  assert.equal(eventEpoch({}), null);
  assert.equal(eventEpoch(null), null);
});

test('filterByCursor replays events up to the cursor and keeps undated points', () => {
  const now = Date.UTC(2026, 9, 1);
  const b = windowBounds(7, now);
  const day = 86_400_000;
  const pts = [
    { id: 'old', time: now - 6 * day },
    { id: 'mid', time: now - 3 * day },
    { id: 'new', time: now - 0.5 * day },
    { id: 'hub' },
  ];
  assert.deepEqual(filterByCursor(pts, cursorTime(0.5, b)).map((p) => p.id), ['old', 'hub']); // cursor = 3.5 days ago
  assert.deepEqual(filterByCursor(pts, cursorTime(0.6, b)).map((p) => p.id), ['old', 'mid', 'hub']);
  assert.deepEqual(filterByCursor(pts, cursorTime(1, b)).map((p) => p.id), ['old', 'mid', 'new', 'hub']);
  assert.deepEqual(filterByCursor(pts, cursorTime(0, b)).map((p) => p.id), ['hub']);
});

test('cursorTime clamps and tolerates NaN', () => {
  const b = { start: 0, end: 100 };
  assert.equal(cursorTime(-5, b), 0);
  assert.equal(cursorTime(5, b), 100);
  assert.equal(cursorTime(NaN, b), 100);
});

test('recency is 1 for new events and fades with age', () => {
  const T = 1_800_000_000_000;
  const b = { start: T, end: T + 1000 };
  assert.equal(recency({ time: T + 1000 }, T + 1000, b), 1);
  assert.ok(recency({ time: T + 500 }, T + 1000, b) < 1);
  assert.equal(recency({}, T + 1000, b), 1);
});
