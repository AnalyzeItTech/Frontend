import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WIDGET_CATALOG, applyDateRange, csvFilename, extractTable, inRange, isDateFilterable, loadDateFilter, moveIndex,
  newWidgetId, objectTableWidget, parseDate, reorder, resolveDateRange, saveDateFilter, tableToCsv,
} from './dashboardTools.mjs';

test('extractTable handles table, object rows, data, series and multi-series widgets', () => {
  assert.deepEqual(extractTable({ columns: ['a', 'b'], rows: [[1, 2]] }), { columns: ['a', 'b'], rows: [[1, 2]] });
  assert.deepEqual(extractTable({ props: { columns: ['a'], rows: [[9]] } }), { columns: ['a'], rows: [[9]] });
  assert.deepEqual(extractTable({ data: [{ n: 'x', v: 1 }, { n: 'y', v: 2 }] }), { columns: ['n', 'v'], rows: [['x', 1], ['y', 2]] });
  assert.deepEqual(extractTable({ series: [{ x: 'Mon', y: 3 }] }), { columns: ['x', 'y'], rows: [['Mon', 3]] });
  assert.deepEqual(
    extractTable({ series: [{ name: 'A', data: [{ x: 1, y: 2 }] }, { name: 'B', data: [{ x: 1, y: 5 }] }] }),
    { columns: ['series', 'x', 'y'], rows: [['A', 1, 2], ['B', 1, 5]] },
  );
  assert.deepEqual(extractTable({ rows: [{ a: 1 }, { b: 2 }] }).columns, ['a', 'b']);
});

test('extractTable returns null when there is nothing tabular', () => {
  assert.equal(extractTable(null), null);
  assert.equal(extractTable({ type: 'metric_card', value: '5' }), null);
  assert.equal(extractTable({ data: [] }), null);
});

test('CSV quoting and formula-injection guard', () => {
  const csv = tableToCsv(['name', 'note'], [['a,b', 'say "hi"'], ['=SUM(A1)', null], ['@cmd', { k: 1 }], [5, 'line\nbreak']]);
  assert.equal(csv.split('\r\n')[0], 'name,note');
  assert.ok(csv.includes('"a,b","say ""hi"""'));
  assert.ok(csv.includes("'=SUM(A1),"));
  assert.ok(csv.includes("'@cmd,"));
  assert.ok(csv.includes('"{""k"":1}"'));
  assert.ok(csv.includes('5,"line\nbreak"'));
});

test('numbers stay numbers in CSV (a negative number is not treated as a formula)', () => {
  assert.ok(tableToCsv(['v'], [[-5]]).endsWith('\r\n-5'));
});

test('csvFilename slugs the title', () => {
  assert.equal(csvFilename('Q3 Revenue (USD)!'), 'q3_revenue_usd.csv');
  assert.equal(csvFilename(''), 'widget.csv');
  assert.equal(csvFilename('***'), 'widget.csv');
});

test('parseDate only accepts ISO-like strings and epoch ms', () => {
  assert.ok(parseDate('2025-03-04'));
  assert.ok(parseDate('2025-03-04T10:00:00Z'));
  assert.equal(parseDate('March'), null);
  assert.equal(parseDate(5), null);
  assert.equal(parseDate(1700000000000)?.getUTCFullYear(), 2023);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate('2025-99-99'), null);
});

test('resolveDateRange presets and inclusive custom end day', () => {
  const now = new Date('2025-06-15T12:00:00Z');
  assert.deepEqual(resolveDateRange('all', now), { from: null, to: null });
  assert.equal(resolveDateRange('7d', now).from.toISOString(), '2025-06-09T00:00:00.000Z');
  assert.equal(resolveDateRange('ytd', now).from.toISOString(), '2025-01-01T00:00:00.000Z');
  const c = resolveDateRange('custom', now, { from: '2025-02-01', to: '2025-02-28' });
  assert.equal(c.from.toISOString(), '2025-02-01T00:00:00.000Z');
  assert.equal(c.to.toISOString(), '2025-02-28T23:59:59.999Z');
  assert.deepEqual(resolveDateRange('custom', now, {}), { from: null, to: null });
  assert.ok(inRange(new Date('2025-02-28T20:00:00Z'), c));
  assert.ok(!inRange(new Date('2025-03-01T00:00:00Z'), c));
});

const RANGE = { from: new Date('2025-01-02T00:00:00Z'), to: new Date('2025-01-03T23:59:59Z') };

test('applyDateRange filters series, data and table rows that have a time axis', () => {
  const line = { id: 'a', series: [{ x: '2025-01-01', y: 1 }, { x: '2025-01-02', y: 2 }, { x: '2025-01-04', y: 4 }] };
  assert.deepEqual(applyDateRange(line, RANGE).series, [{ x: '2025-01-02', y: 2 }]);
  const data = { id: 'b', props: { data: [{ date: '2025-01-01', v: 1 }, { date: '2025-01-03', v: 3 }] } };
  assert.deepEqual(applyDateRange(data, RANGE).props.data, [{ date: '2025-01-03', v: 3 }]);
  const table = { id: 'c', columns: ['Date', 'Amount'], rows: [['2025-01-01', 5], ['2025-01-03', 7]] };
  assert.deepEqual(applyDateRange(table, RANGE).rows, [['2025-01-03', 7]]);
  const multi = { id: 'd', series: [{ name: 'A', data: [{ x: '2025-01-01', y: 1 }, { x: '2025-01-02', y: 2 }] }] };
  assert.deepEqual(applyDateRange(multi, RANGE).series[0].data, [{ x: '2025-01-02', y: 2 }]);
});

test('applyDateRange leaves widgets without a time axis untouched (same object) and never mutates input', () => {
  const bars = { id: 'e', series: [{ label: 'A', y: 1 }] };
  assert.equal(applyDateRange(bars, RANGE), bars);
  const metric = { id: 'f', value: '5' };
  assert.equal(applyDateRange(metric, RANGE), metric);
  const line = { id: 'g', series: [{ x: '2025-01-01', y: 1 }] };
  const before = JSON.stringify(line);
  applyDateRange(line, RANGE);
  assert.equal(JSON.stringify(line), before);
  assert.equal(applyDateRange(line, { from: null, to: null }), line);
});

test('isDateFilterable reports which widgets the filter can affect', () => {
  assert.equal(isDateFilterable({ series: [{ x: '2025-01-01', y: 1 }] }), true);
  assert.equal(isDateFilterable({ series: [{ label: 'A', y: 1 }] }), false);
  assert.equal(isDateFilterable({ value: '1' }), false);
});

test('date filter persists per project and tolerates bad storage', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadDateFilter(storage, 'p1'), { preset: 'all', from: '', to: '' });
  saveDateFilter(storage, 'p1', { preset: '30d', from: '', to: '' });
  assert.equal(loadDateFilter(storage, 'p1').preset, '30d');
  assert.equal(loadDateFilter(storage, 'p2').preset, 'all');
  assert.equal(loadDateFilter({ getItem: () => '{"preset":"bogus"}' }, 'p').preset, 'all');
  assert.equal(loadDateFilter({ getItem() { throw new Error('x'); } }, 'p').preset, 'all');
  assert.doesNotThrow(() => saveDateFilter({ setItem() { throw new Error('x'); } }, 'p', { preset: 'all', from: '', to: '' }));
});

test('moveIndex / reorder validate indices and do not mutate', () => {
  assert.deepEqual(moveIndex(0, 2, 3), { from: 0, to: 2 });
  for (const [f, t] of [[0, 0], [-1, 1], [0, 3], [1.5, 2], [undefined, 1]]) assert.equal(moveIndex(f, t, 3), null);
  const items = ['a', 'b', 'c', 'd'];
  assert.deepEqual(reorder(items, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorder(items, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(items, ['a', 'b', 'c', 'd']);
  assert.equal(reorder(items, 1, 1), items);
});

test('catalog entries build well-formed specs with unique ids and honest sample labelling', () => {
  const ids = new Set();
  for (const entry of WIDGET_CATALOG) {
    const w = entry.build(`id_${entry.type}`);
    ids.add(w.id);
    assert.equal(w.type, entry.type);
    assert.equal(w.component, entry.type);
    assert.ok(w.title);
    if (Array.isArray(w.series) || Array.isArray(w.data) || Array.isArray(w.rows)) {
      assert.match(w.freshness, /sample data/i, `${entry.type} sample data must be labelled`);
    }
  }
  assert.equal(ids.size, WIDGET_CATALOG.length);
  assert.ok(WIDGET_CATALOG.length >= 6);
});

test('objectTableWidget binds to object records for live refresh', () => {
  const w = objectTableWidget('w1', 'p1', 'contacts', 'Contacts');
  assert.equal(w.binding.query_type, 'object_records');
  assert.deepEqual(w.binding.params, { object_api_name: 'contacts', project_id: 'p1', limit: 50 });
  assert.equal(w.binding_type, 'object_bound');
  assert.equal(w.title, 'Contacts records');
});

test('newWidgetId is unique', () => {
  assert.notEqual(newWidgetId(), newWidgetId());
  assert.match(newWidgetId('x'), /^x_/);
});
