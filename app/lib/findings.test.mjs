import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  withoutFindingList, breakdownLine, MAX_BARS, MAX_FINDINGS, MAX_POINTS, MAX_SCATTER, bandGeometry, barsGeometry, chartAlt, checkedLine, discoveryStatus, formatNumber, formatPeriod,
  isDiscoveryRoute, lineGeometry, meterGeometry, parseFindings, parseVisual, partialLine, reduceSteps, safeUrl, scatterGeometry, stepIndex,
} from './findings.mjs';

const sample = JSON.parse(readFileSync(new URL('./fixtures/findings.sample.json', import.meta.url), 'utf8'));
const parsed = parseFindings(sample);
const byType = (t) => parsed.findings.find((f) => f.visual?.type === t);

test('a real Model payload parses with every chart kind intact', () => {
  assert.equal(parsed.findings.length, sample.findings.length);
  for (const t of ['line', 'band', 'meter', 'bars', 'scatter']) assert.ok(byType(t), t);
  for (const f of parsed.findings) {
    assert.ok(f.title && f.soWhat && f.sql.startsWith('SELECT'), f.id);
    assert.ok(f.visual, f.id);
    assert.ok(chartAlt(f).length > 20, f.id);
  }
  assert.ok(parsed.checked.analyses > parsed.findings.length); // more was checked than found, and the UI says so
});

test('headline counts are honest', () => {
  assert.match(checkedLine(parsed), /^Checked \d+ things across \d+ tables? · 6 stood out$/);
  assert.match(partialLine(parsed), /sales: 3,000 of 9,000 rows/);
  assert.equal(partialLine({ ...parsed, partial: [] }), '');
  assert.equal(checkedLine(null), '');
});

test('the breakdown names what was checked, most first', () => {
  const line = breakdownLine(parsed);
  assert.match(line, /^\d+ [a-z -]+(, \d+ [a-z -]+)*$/);
  assert.match(line, /comparisons? between groups/);
  assert.equal(breakdownLine({ ...parsed, checked: { ...parsed.checked, byKind: { gap: 1, mystery: 2, trend: 0 } } }), '2 checks, 1 comparison between groups');
  assert.equal(breakdownLine(null), '');
});

test('versions, junk and empties give no cards instead of errors', () => {
  assert.equal(parseFindings(null), null);
  assert.equal(parseFindings('x'), null);
  assert.equal(parseFindings({ ...sample, version: 2 }), null);
  assert.equal(parseFindings({ version: 1, findings: [], checked: { analyses: 0 } }), null);
  assert.equal(parseFindings({ version: 1, findings: 'no' }), null);
  assert.ok(parseFindings({ version: 1, findings: [], checked: { analyses: 5, tables: [{ name: 't', rows: 3, total: 3 }] } }));
});

test('text from the data is plain, bounded and cannot carry markup or odd characters', () => {
  const evil = { ...sample.findings[0], title: 'North‮​ <img src=x onerror=alert(1)> \n\n  big', so_what: 'x'.repeat(5000), source: { table: 't', origin: 'online', url: 'javascript:alert(1)' } };
  const p = parseFindings({ ...sample, findings: [evil] });
  const f = p.findings[0];
  assert.ok(!/[‮​\n]/.test(f.title));
  assert.equal(f.soWhat.length, 220);
  assert.equal(f.source.url, '');
  assert.equal(f.source.origin, 'online');
  assert.equal(safeUrl('https://data.gov/x.csv?a=1'), 'https://data.gov/x.csv?a=1');
  assert.equal(safeUrl('ftp://x'), '');
  assert.equal(safeUrl('not a url'), '');
  const none = parseFindings({ ...sample, findings: [{ ...sample.findings[0], title: '  ' }, 'junk', null] });
  assert.equal(none.findings.length, 0); // invalid findings are dropped; the honest 'checked N, nothing stood out' summary remains
  assert.match(checkedLine(none), /0 stood out$/);
});

test('everything is capped', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ ...sample.findings[0], id: `f${i}` }));
  assert.equal(parseFindings({ ...sample, findings: many }).findings.length, MAX_FINDINGS);
  const long = parseVisual({ type: 'line', x: Array.from({ length: 500 }, (_, i) => `2024-${i}`), series: [{ role: 'main', values: Array.from({ length: 500 }, (_, i) => i) }], highlight: [3, 9999, -1, 1.5] });
  assert.equal(long.x.length, MAX_POINTS);
  assert.deepEqual(long.highlight, [3]); // out-of-range and non-integer highlights are dropped
  const bars = parseVisual({ type: 'bars', items: Array.from({ length: 40 }, (_, i) => ({ label: `g${i}`, value: i })) });
  assert.equal(bars.items.length, MAX_BARS);
  const sc = parseVisual({ type: 'scatter', points: Array.from({ length: 1000 }, (_, i) => [i, i * 2]) });
  assert.equal(sc.points.length, MAX_SCATTER);
  assert.equal(parseFindings({ ...sample, findings: [{ ...sample.findings[0], figures: Array.from({ length: 50 }, (_, i) => ({ label: `a${i}`, value: '1' })) }] }).findings[0].figures.length, 14);
});

test('non-finite numbers and malformed visuals are dropped, not drawn', () => {
  const l = parseVisual({ type: 'line', x: ['a', 'b', 'c'], series: [{ role: 'main', values: [1, NaN, Infinity] }] });
  assert.equal(l, null); // fewer than two real points
  const l2 = parseVisual({ type: 'line', x: ['a', 'b', 'c'], series: [{ role: 'main', values: [1, null, 3] }, { role: 'zzz', values: [1, 2, 3] }] });
  assert.deepEqual(l2.series.map((s) => s.role), ['main', 'main']);
  assert.equal(parseVisual({ type: 'bars', items: [{ label: 'a', value: 1 }] }), null);
  assert.equal(parseVisual({ type: 'scatter', points: [[1, 2]] }), null);
  assert.equal(parseVisual({ type: 'meter', parts: [{ label: 'a', value: 1 }], total: 0 }), null);
  assert.equal(parseVisual({ type: 'band', low: 1, high: 2, center: 'x', values: [] }), null);
  assert.equal(parseVisual({ type: 'pie', slices: [] }), null);
  assert.equal(parseVisual(null), null);
  const unknown = parseFindings({ ...sample, findings: [{ ...sample.findings[0], visual: { type: 'hologram' } }] });
  assert.equal(unknown.findings[0].visual, null); // the card still shows its words and numbers
});

test('number and period formatting', () => {
  assert.equal(formatNumber(1234567), '1.2M');
  assert.equal(formatNumber(49000), '49K');
  assert.equal(formatNumber(12500), '12.5K');
  assert.equal(formatNumber(1234), '1,234');
  assert.equal(formatNumber(296.36), '296');
  assert.equal(formatNumber(4.5912), '4.59');
  assert.equal(formatNumber(0.0123), '0.012');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(0.491, 'percent'), '49%');
  assert.equal(formatNumber(0.056, 'percent'), '5.6%');
  assert.equal(formatNumber(NaN), '–');
  assert.equal(formatNumber(-2500000), '-2.5M');
  assert.equal(formatPeriod('2024-03'), 'Mar ’24');
  assert.equal(formatPeriod('2024-W07'), 'W7 ’24');
  assert.equal(formatPeriod('2024-Q2'), 'Q2 ’24');
  assert.equal(formatPeriod('2024-03-15'), '15 Mar');
  assert.equal(formatPeriod('2024'), '2024');
  assert.equal(formatPeriod('a very long label here'), 'a very long…');
});

test('line geometry: points inside the plot, the odd month marked, labels thinned to fit', () => {
  const f = byType('line');
  for (const w of [260, 360, 620]) {
    const g = lineGeometry(f.visual, w);
    assert.equal(g.highlight.length, 1);
    const h = g.highlight[0];
    assert.ok(h.x >= g.plot.l && h.x <= g.plot.r && h.y >= g.plot.t && h.y <= g.plot.b);
    assert.equal(f.visual.x[h.i], '2024-03');
    assert.ok(g.xTicks.length <= Math.floor((w - 60) / 58) + 2, `${w}: ${g.xTicks.length}`);
    const ys = g.yTicks.map((t) => t.y);
    assert.deepEqual([...ys].sort((a, b) => b - a), ys); // up the axis
    for (const s of g.series) for (const p of s.points) assert.ok(p.x >= g.plot.l - 0.01 && p.x <= g.plot.r + 0.01);
    assert.ok(g.series.some((s) => s.role === 'baseline'));
  }
});

test('a gap in the data breaks the line instead of joining across it', () => {
  const v = parseVisual({ type: 'line', x: ['a', 'b', 'c', 'd', 'e'], series: [{ role: 'main', values: [1, 2, null, 4, 5] }] });
  const g = lineGeometry(v, 400);
  assert.equal((g.series[0].path.match(/M/g) || []).length, 2);
  assert.equal(lineGeometry(parseVisual({ type: 'line', x: ['a', 'b'], series: [{ role: 'main', values: [5, 5] }] }), 300).yTicks.length >= 2, true); // flat series
});

test('bar geometry: both ends marked, a baseline, percent labels', () => {
  const f = parsed.findings.find((x) => x.visual?.type === 'bars' && x.visual.format === 'percent' && x.kind === 'gap');
  const g = barsGeometry(f.visual);
  assert.equal(g.rows.filter((r) => r.highlight).length, 2);
  assert.ok(g.baselinePct > 0 && g.baselinePct <= 100);
  assert.ok(g.rows.every((r) => r.pct > 0 && r.pct <= 100));
  assert.match(g.rows[0].valueLabel, /%$/);
  assert.equal(Math.max(...g.rows.map((r) => r.pct)) > 90, true);
});

test('scatter geometry: points and the fit line stay inside the plot', () => {
  const f = byType('scatter');
  const g = scatterGeometry(f.visual, 340);
  for (const p of g.points) assert.ok(p.x >= g.plot.l - 0.01 && p.x <= g.plot.r + 0.01 && p.y >= g.plot.t - 0.01 && p.y <= g.plot.b + 0.01);
  assert.ok(g.fit);
  for (const [x, y] of g.fit) assert.ok(x >= g.plot.l - 0.01 && x <= g.plot.r + 0.01 && y >= g.plot.t - 0.01 && y <= g.plot.b + 0.01);
  assert.ok(g.fit[1][1] < g.fit[0][1]); // a rising relationship slopes up the screen (smaller y)
  const none = scatterGeometry({ ...f.visual, fit: null }, 340);
  assert.equal(none.fit, null);
  const out = scatterGeometry({ ...f.visual, fit: [[-1e6, -1e6], [-1e6 + 1, -1e6 + 1]] }, 340);
  assert.equal(out.fit, null); // a line wholly outside is not drawn
});

test('band and meter geometry', () => {
  const b = bandGeometry(byType('band').visual, 320);
  assert.ok(b.bandL >= 0 && b.bandR <= 320 && b.bandL <= b.bandR);
  assert.ok(b.points.every((p) => p.x >= 0 && p.x <= 320));
  const m = meterGeometry(byType('meter').visual);
  assert.ok(m.parts.reduce((s, p) => s + p.pct, 0) <= 102);
  const tiny = meterGeometry({ type: 'meter', parts: [{ label: 'Unique', value: 2999, tone: 'ok' }, { label: 'Repeats', value: 1, tone: 'warn' }, { label: 'None', value: 0, tone: 'ok' }], total: 3000 });
  assert.ok(tiny.parts[1].pct >= 1.2); // visible
  assert.equal(tiny.parts[2].pct, 0);
});

test('every chart has a sentence for screen readers', () => {
  assert.match(chartAlt(byType('line')), /^Line chart of .* Highlighted: Mar ’24/);
  assert.match(chartAlt(parsed.findings.find((f) => f.visual?.type === 'bars')), /^Bar chart of \d+ groups\. Highest: .* Lowest: /);
  assert.match(chartAlt(byType('scatter')), /^Scatter plot of .* rising relationship \(correlation 0\.\d\d\)\.$/);
  assert.match(chartAlt(byType('band')), /^Typical range .* Unusual values outside it: /);
  assert.match(chartAlt(byType('meter')), /out of/);
  assert.equal(chartAlt({ visual: null }), '');
});

test('keyboard stepping stays in range', () => {
  assert.equal(stepIndex(0, 'ArrowLeft', 5), 0);
  assert.equal(stepIndex(4, 'ArrowRight', 5), 4);
  assert.equal(stepIndex(2, 'ArrowRight', 5), 3);
  assert.equal(stepIndex(2, 'Home', 5), 0);
  assert.equal(stepIndex(2, 'End', 5), 4);
  assert.equal(stepIndex(9, 'x', 5), 4);
  assert.equal(stepIndex(undefined, 'ArrowRight', 5), 1);
  assert.equal(stepIndex(1, 'ArrowRight', 0), 0);
});

test('live progress folds into an ordered step list', () => {
  let s = reduceSteps(undefined, { step: 'load', state: 'running' });
  assert.deepEqual(s.map((x) => x.state), ['running', 'pending', 'pending', 'pending', 'pending']);
  s = reduceSteps(s, { step: 'load', state: 'done', tables: 2, rows: 5000 });
  assert.equal(s[0].state, 'done');
  assert.equal(s[0].detail, '2 tables, 5,000 rows');
  s = reduceSteps(s, { step: 'profile', state: 'running', table: 'orders', rows: 5000, cols: 8 });
  assert.equal(s[1].detail, 'orders: 5,000 rows, 8 columns');
  s = reduceSteps(s, { step: 'analyse', state: 'running', done: 12, total: 40 });
  assert.equal(s[1].state, 'done'); // starting a step finishes the ones before it
  assert.equal(s[2].detail, '12 of about 40 checks');
  s = reduceSteps(s, { step: 'analyse', state: 'running', done: 44, total: 40 });
  assert.equal(s[2].detail, '44 of about 44 checks'); // never "44 of 40"
  s = reduceSteps(s, { step: 'analyse', state: 'done', done: 44 });
  s = reduceSteps(s, { step: 'rank', state: 'done', found: 6 });
  assert.equal(s[3].detail, '6 stood out');
  assert.equal(s[2].state, 'done');
  s = reduceSteps(s, { step: 'write', state: 'running' });
  assert.deepEqual(s.map((x) => x.state), ['done', 'done', 'done', 'done', 'running']);
  assert.equal(reduceSteps(s, { step: 'bogus' }), s);
  assert.equal(reduceSteps(s, null), s);
});

test('status line and route detection', () => {
  assert.equal(discoveryStatus({ step: 'analyse', state: 'running', done: 3, total: 20 }), 'Looking for patterns: 3 of about 20 checks');
  assert.equal(discoveryStatus({ step: 'write' }), 'Writing it up…');
  assert.equal(discoveryStatus({ step: 'weird' }), 'Looking through your data…');
  assert.equal(discoveryStatus(null), 'Looking through your data…');
  assert.equal(isDiscoveryRoute('data_discovery:'), true);
  assert.equal(isDiscoveryRoute('data_discovery:orders'), true);
  assert.equal(isDiscoveryRoute('object_query:orders'), false);
  assert.equal(isDiscoveryRoute(undefined), false);
});

test('axes hug the data: ticks stay inside the plot and there is no empty band', () => {
  const g = scatterGeometry(byType('scatter').visual, 340);
  for (const t of g.yTicks) assert.ok(t.y >= g.plot.t - 0.5 && t.y <= g.plot.b + 0.5, `y tick ${t.label}`);
  for (const t of g.xTicks) assert.ok(t.x >= g.plot.l - 0.5 && t.x <= g.plot.r + 0.5, `x tick ${t.label}`);
  assert.ok(g.yTicks.length >= 2);
  assert.ok(!g.yTicks.some((t) => t.label.startsWith('-'))); // the data is all positive: no negative band
  const l = lineGeometry(byType('line').visual, 360);
  for (const t of l.yTicks) assert.ok(t.y >= l.plot.t - 0.5 && t.y <= l.plot.b + 0.5);
  const flat = lineGeometry(parseVisual({ type: 'line', x: ['a', 'b', 'c'], series: [{ role: 'main', values: [7, 7, 7] }] }), 300);
  assert.ok(flat.yTicks.length >= 2);
});

test('the text drops its list when the cards show the same findings, and only then', () => {
  const text = 'I ran 5 checks; 2 stood out.\n\n**What I found**\n1. One (strong evidence)\n2. Two (likely)';
  assert.equal(withoutFindingList(text), 'I ran 5 checks; 2 stood out.');
  assert.equal(withoutFindingList('plain answer'), 'plain answer');
  assert.equal(withoutFindingList(undefined), '');
});
