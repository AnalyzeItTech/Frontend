import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { staleLiveWidgets } from './refreshOnOpen.mjs';

const NOW = Date.parse('2026-10-04T12:00:00Z');
const live = (id, over = {}) => ({ id, refresh_policy: { mode: 'on_open' }, binding: { query_type: 'object_aggregate', params: {}, ...over } });

describe('staleLiveWidgets', () => {
  it('picks live object widgets set to refresh on open', () => {
    const ws = [live('a'), live('b', { query_type: 'object_records' })];
    assert.deepEqual(staleLiveWidgets(ws, NOW), ['a', 'b']);
  });

  it('never picks bindings that could cost tokens or hit other services', () => {
    const ws = [live('a', { query_type: 'sql_query' }), live('b', { query_type: 'stock_quote' }), { id: 'c', refresh_policy: { mode: 'on_open' } },
                { id: 'd', binding: { query_type: 'object_aggregate' } }, { id: 'e', refresh_policy: { mode: 'manual' }, binding: { query_type: 'object_aggregate' } }];
    assert.deepEqual(staleLiveWidgets(ws, NOW), []);
  });

  it('skips a widget refreshed within the last minute, but not an older or never-refreshed one', () => {
    const ws = [live('fresh', { last_refreshed_at: '2026-10-04T11:59:30Z' }), live('old', { last_refreshed_at: '2026-10-04T11:50:00Z' }), live('never')];
    assert.deepEqual(staleLiveWidgets(ws, NOW), ['old', 'never']);
  });

  it('caps how many refresh on one open and tolerates junk', () => {
    const many = Array.from({ length: 20 }, (_, i) => live(`w${i}`));
    assert.equal(staleLiveWidgets(many, NOW).length, 12);
    assert.equal(staleLiveWidgets(many, NOW, 60000, 3).length, 3);
    assert.deepEqual(staleLiveWidgets(undefined, NOW), []);
    assert.deepEqual(staleLiveWidgets([null, {}, { id: 1 }], NOW), []);
    assert.deepEqual(staleLiveWidgets([live('x', { last_refreshed_at: 'garbage' })], NOW), ['x']);
  });
});
