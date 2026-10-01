import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExtras, niceTicks, chartGeometry, formatValue, safeHref, parseTableAt } from './chatExtras.mjs';

const chart = { type: 'line', title: 'GDP growth', unit: '% annual', source_url: 'https://data.worldbank.org/x',
  series: [{ name: 'India', points: [[2020, 4], [2021, 9], [2022, 7]] }, { name: 'Vietnam', points: [[2020, 2.5], [2022, 8]] }] };

test('parseExtras accepts good payloads and normalises names', () => {
  const out = parseExtras({ charts: [chart], places: [{ name: 'India', lat: 28.6, lon: 77.2 }, { lat: 1, lng: 2 }], suggestions: ['  Ask more  ', 'Ask more'] });
  assert.equal(out.charts.length, 1);
  assert.equal(out.charts[0].series[0].points.length, 3);
  assert.equal(out.charts[0].sourceUrl, 'https://data.worldbank.org/x');
  assert.equal(out.places.length, 2);
  assert.equal(out.places[1].lon, 2);
  assert.deepEqual(out.suggestions, ['Ask more']);
});

test('parseExtras rejects junk instead of throwing', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { charts: 'no', places: 7, suggestions: {} }]) {
    assert.deepEqual(parseExtras(bad), { charts: [], places: [], suggestions: [] });
  }
  const out = parseExtras({
    charts: [{ series: [{ name: 'x', points: [['a', 1], [1, NaN], [1, Infinity]] }] }, { series: [] }, null],
    places: [{ lat: 999, lon: 0 }, { lat: 'a', lon: 1 }, { lat: 10, lon: 200 }],
  });
  assert.equal(out.charts.length, 0);
  assert.equal(out.places.length, 0);
});

test('parseExtras drops non-http source urls and caps sizes', () => {
  const c = parseExtras({ charts: [{ ...chart, source_url: 'javascript:alert(1)' }] }).charts[0];
  assert.equal(c.sourceUrl, '');
  const many = parseExtras({ charts: Array(9).fill(chart), suggestions: Array.from({ length: 9 }, (_, i) => `question ${i}`) });
  assert.equal(many.charts.length, 3);
  assert.equal(many.suggestions.length, 4);
});

test('niceTicks are round, ascending and cover the range', () => {
  const t = niceTicks(2.3, 11.4, 5);
  assert.ok(t[0] <= 2.3 && t[t.length - 1] >= 11.4);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
  assert.deepEqual(niceTicks(5, 5), [0, 5, 10]);
  assert.deepEqual(niceTicks(NaN, 1), [0, 1]);
});

test('chartGeometry maps data inside the plot area and orients y upward', () => {
  const ex = parseExtras({ charts: [chart] }).charts[0];
  const g = chartGeometry(ex, 560, 240);
  for (const s of g.series) for (const p of s.points) {
    assert.ok(p.x >= g.pad.l - 0.01 && p.x <= g.width - g.pad.r + 0.01);
    assert.ok(p.y >= g.pad.t - 0.01 && p.y <= g.height - g.pad.b + 0.01);
  }
  const india = g.series[0].points;
  assert.ok(india[1].y < india[0].y, 'higher value => smaller svg y');
  assert.match(g.series[0].d, /^M[\d.]+,[\d.]+L/);
  assert.notEqual(g.series[0].color, g.series[1].color);
});

test('chartGeometry survives a single point and flat data', () => {
  const g = chartGeometry({ type: 'line', series: [{ name: 'a', points: [[2020, 5]] }] });
  assert.ok(Number.isFinite(g.series[0].points[0].x) && Number.isFinite(g.series[0].points[0].y));
  const flat = chartGeometry({ type: 'line', series: [{ name: 'a', points: [[1, 3], [2, 3]] }] });
  assert.ok(flat.series[0].points.every((p) => Number.isFinite(p.y)));
});

test('formatValue', () => {
  assert.equal(formatValue(7.234, '% annual'), '7.2%');
  assert.equal(formatValue(2.5e12, 'current US$'), '2.50T');
  assert.equal(formatValue(1.4e9), '1.40B');
  assert.equal(formatValue(12345), '12,345');
  assert.equal(formatValue(NaN), '');
});

test('safeHref blocks script and data urls', () => {
  assert.equal(safeHref('https://a.com/x'), 'https://a.com/x');
  assert.equal(safeHref('mailto:a@b.co'), 'mailto:a@b.co');
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,hi', '//evil.com', '/relative', '', null]) {
    assert.equal(safeHref(bad), null, String(bad));
  }
});

test('parseTableAt parses pipe tables with alignment and ragged rows', () => {
  const lines = ['| Country | GDP | Note |', '|:--|--:|:-:|', '| India | 3.9T |', '| Vietnam | 0.43T | ok |', '', 'after'];
  const t = parseTableAt(lines, 0);
  assert.deepEqual(t.header, ['Country', 'GDP', 'Note']);
  assert.deepEqual(t.align, ['left', 'right', 'center']);
  assert.deepEqual(t.rows, [['India', '3.9T', ''], ['Vietnam', '0.43T', 'ok']]);
  assert.equal(t.next, 4);
  assert.equal(parseTableAt(['not | a table', 'plain'], 0), null);
  assert.equal(parseTableAt(['a | b'], 0), null);
});
