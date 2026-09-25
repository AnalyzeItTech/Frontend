/**
 * Globe data-quality: coordinates, layer honesty, catalog merge, Ask mapping, Stop/Retry.
 * Run: node --test app/Components/globe/dataQuality.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dedupePointsByHost,
  eventCoordinates,
  formatSatelliteVelocity,
  globeAskPrompt,
  hostFromSourceFoundDetail,
  interpretLayerPayload,
  layerCountLabel,
  mergeLayerRefresh,
  messageOffersRetry,
  normalizeLatLon,
  resolveArchivePoints,
  selectDisplayPoints,
  sourceFromProgressPayload,
  stoppedAssistantMessage,
  strongestRows,
} from './dataQuality.mjs';
import { mapLayerEventsToPoints } from './liveOverlays.mjs';

describe('coordinates', () => {
  it('drops out-of-range and bare null-island sentinels', () => {
    assert.equal(eventCoordinates({ lat: 200, lon: 10 }), null);
    assert.equal(eventCoordinates({ lat: 95, lon: 95 }), null);
    assert.equal(eventCoordinates({ lat: 'nope', lon: 10 }), null);
    assert.equal(eventCoordinates({ lat: 0, lon: 0 }), null);
    const kept = eventCoordinates({ lat: 0, lon: 0, place: 'Gulf of Guinea' });
    assert.equal(kept.lat, 0);
    assert.equal(kept.lon, 0);
  });

  it('accepts numeric strings and swaps a reversed pair', () => {
    assert.deepEqual(normalizeLatLon('37.7', '-122.4'), { lat: 37.7, lon: -122.4 });
    assert.deepEqual(normalizeLatLon(-122.4, 37.7), { lat: 37.7, lon: -122.4 });
  });

  it('overlay mapper uses lon aliases and skips junk rows', () => {
    const points = mapLayerEventsToPoints('earthquakes', [
      { id: 'ok', lat: '35.1', lng: '139.2', mag: 5.2, place: 'Honshu' },
      { id: 'bad', lat: 400, lon: 10 },
      { lat: 0, lon: 0 },
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0].id, 'earthquakes:ok');
    assert.equal(points[0].lon, 139.2);
    assert.equal(points[0].meta.mag, 5.2);
  });
});

describe('layer freshness', () => {
  it('keeps the last good events when a refresh fails', () => {
    const previous = { events: [{ id: 'q1', lat: 1, lon: 2 }], path: null };
    const failed = interpretLayerPayload({ fetchError: 'Globe layer timed out' });
    const merged = mergeLayerRefresh(previous, failed);
    assert.equal(merged.status, 'stale');
    assert.equal(merged.events.length, 1);
    assert.equal(layerCountLabel(1, merged), '1 stale');
    assert.equal(layerCountLabel(0, { status: 'error' }), 'unavailable');
  });

  it('does not call a quiet layer an error', () => {
    const quiet = interpretLayerPayload({ available: true, events: [] });
    const merged = mergeLayerRefresh({ events: [{ id: 'old' }] }, quiet);
    assert.equal(merged.status, 'empty');
    assert.equal(merged.events.length, 0);
    assert.equal(layerCountLabel(0, merged), '0');
  });
});

describe('catalog vs registry', () => {
  it('keeps colocated hosts and lets a non-empty registry replace the fallback', () => {
    const fallback = [
      { id: 'archive:who.int', host: 'who.int', lat: 46.23, lon: 6.14 },
      { id: 'archive:wto.org', host: 'wto.org', lat: 46.23, lon: 6.14 },
      { id: 'archive:bbc.com', host: 'bbc.com', lat: 51.5, lon: -0.1 },
    ];
    const kept = dedupePointsByHost(fallback);
    assert.equal(kept.length, 3);
    const registry = resolveArchivePoints(fallback, [
      { id: 'archive:usgs.gov', host: 'usgs.gov', lat: 38.91, lon: -77.36 },
    ]);
    assert.equal(registry.origin, 'registry');
    assert.deepEqual(
      registry.points.map((p) => p.host),
      ['usgs.gov'],
    );
    assert.equal(resolveArchivePoints(fallback, []).origin, 'fallback');
  });
});

describe('ranked metrics', () => {
  it('does not rank magnitude against elevation', () => {
    const { unit, rows } = strongestRows([
      { id: 'q', kind: 'event', label: 'Quake', meta: { mag: 6.1 } },
      { id: 'e1', kind: 'event', label: 'Peak', meta: { elevation_m: 4000 } },
      { id: 'e2', kind: 'event', label: 'Hill', meta: { elevation_m: 200 } },
      { id: 'hq', kind: 'archive', label: 'USGS', meta: {} },
    ]);
    assert.equal(unit, 'm');
    assert.deepEqual(
      rows.map((r) => r.id),
      ['e1', 'e2'],
    );
  });
});

describe('Ask mapping and cancel', () => {
  it('pins coordinates into the research prompt', () => {
    const q = globeAskPrompt('Ask about this place: Mumbai', [
      { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777 },
    ]);
    assert.match(q, /Mumbai, India @ 19\.0760, 72\.8777/);
  });

  it('reads a real host out of a source_found detail URL', () => {
    assert.equal(
      hostFromSourceFoundDetail('https://earthquake.usgs.gov/fdsnws/event/1/query'),
      'earthquake.usgs.gov',
    );
    const found = sourceFromProgressPayload({
      detail: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
      lat: 35,
      lng: 139,
    });
    assert.equal(found.host, 'earthquake.usgs.gov');
    assert.equal(found.url, 'https://earthquake.usgs.gov');
    assert.equal(found.lat, 35);
    assert.equal(found.lng, 139);
    assert.equal(sourceFromProgressPayload({ detail: 'Gathering sources…' }), null);
  });

  it('Stop releases a streaming message and Retry can run again', () => {
    const stopped = stoppedAssistantMessage({
      id: 'a',
      role: 'assistant',
      content: '',
      streaming: true,
      status: 'Calling web_search…',
    });
    assert.equal(stopped.streaming, false);
    assert.equal(stopped.content, 'Stopped.');
    assert.equal(stopped.status, undefined);
    assert.equal(messageOffersRetry(stopped), true);
    assert.equal(messageOffersRetry({ ...stopped, streaming: true }), false);
    const timed = stoppedAssistantMessage(
      { role: 'assistant', content: 'Partial answer', streaming: true },
      { timedOut: true },
    );
    assert.equal(timed.content, 'Partial answer');
    assert.equal(messageOffersRetry(timed), true);
  });
});

describe('mini globe pins', () => {
  it('shows this run only, capped, and omits the HQ catalog', () => {
    const archive = [{ id: 'archive:usgs.gov', label: 'USGS' }];
    const active = Array.from({ length: 3 }, (_, i) => ({ id: `live:${i}`, label: String(i) }));
    const mini = selectDisplayPoints({
      variant: 'mini',
      showCatalog: true,
      archivePoints: archive,
      activePoints: active,
      overlayPoints: [{ id: 'earthquakes:1' }],
      cap: 2,
    });
    assert.deepEqual(
      mini.map((p) => p.id),
      ['live:1', 'live:2'],
    );
    const full = selectDisplayPoints({
      variant: 'full',
      showCatalog: true,
      archivePoints: archive,
      activePoints: active,
      overlayPoints: [],
      cap: 2,
    });
    assert.equal(full[0].id, 'archive:usgs.gov');
    assert.equal(full.length, 4);
  });
});
