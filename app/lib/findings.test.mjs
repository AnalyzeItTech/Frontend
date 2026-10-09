import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  onlineNotice, provenanceLine, sourceLines, STEP_DEFS_ONLINE, withoutFindingList, breakdownLine, MAX_BARS, MAX_FINDINGS, MAX_POINTS, MAX_SCATTER, bandGeometry, barsGeometry, chartAlt, checkedLine, discoveryStatus, formatNumber, formatPeriod,
  isDiscoveryRoute, forecastGeometry, lineGeometry, meterGeometry, parseFindings, parseVisual, partialLine, reduceSteps, safeUrl, scatterGeometry, stepIndex,
} from './findings.mjs';

const sample = JSON.parse(readFileSync(new URL('./fixtures/findings.sample.json', import.meta.url), 'utf8'));
const online = parseFindings(JSON.parse(readFileSync(new URL('./fixtures/findings.online.json', import.meta.url), 'utf8')));
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
  assert.equal(f.soWhat.length, 360);
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

test('an online payload carries its scope, sources and per-finding provenance', () => {
  assert.equal(online.scope.mode, 'online');
  assert.equal(online.scope.sources.length, 1);
  const src = online.scope.sources[0];
  assert.equal(src.host, 'api.worldbank.org');
  assert.equal(src.publisherLabel, 'international organisation');
  assert.equal(src.latest, '2022-01-01');
  assert.ok(src.notes.some((n) => n.includes('one column per year')));
  const f = online.findings[0];
  assert.equal(f.source.origin, 'online');
  assert.equal(f.provenance.host, 'api.worldbank.org');
  assert.equal(f.confidence, 'likely'); // never "strong" for data nobody has verified
  assert.equal(parsed.scope.mode, 'project'); // the user's own data has no source banner
  assert.equal(parsed.findings[0].provenance, null);
});

test('the notice and the source line say where it came from and that it is unchecked', () => {
  assert.equal(onlineNotice(online), 'This data comes from the internet (api.worldbank.org) and has not been checked by us. Check anything important at the source.');
  assert.equal(onlineNotice(parsed), '');
  assert.equal(onlineNotice(null), '');
  assert.equal(provenanceLine(online.findings[0]), 'api.worldbank.org · international organisation · downloaded 5 Oct 2026');
  assert.equal(provenanceLine(parsed.findings[0]), '');
  assert.equal(provenanceLine(null), '');
});

test('source facts for the working panel', () => {
  const base = online.scope.sources[0];
  assert.deepEqual(sourceLines(base), ['GDP growth (annual %)', 'api.worldbank.org · international organisation', 'Downloaded 5 Oct 2026', 'Newest observation: 2022', '138 rows read']);
  assert.ok(sourceLines({ ...base, rowsLoaded: 5000, rowsTotal: 9000 }).includes('5,000 of 9,000 rows read'));
  assert.ok(sourceLines({ ...base, rowsLoaded: 5000, rowsTotal: null }).includes('the first 5,000 rows read (the file is larger)'));
  assert.ok(sourceLines({ ...base, latest: '2024-03-01' }).includes('Newest observation: 2024-03'));
  assert.deepEqual(sourceLines(null), []);
  assert.ok(!sourceLines({ ...base, fetchedAt: 'garbage' }).some((l) => l.startsWith('Downloaded')));
});

test('hostile text in the scope is cleaned, odd publishers become unrecognised, links must be http(s)', () => {
  const evil = { ...JSON.parse(readFileSync(new URL('./fixtures/findings.online.json', import.meta.url), 'utf8')) };
  evil.scope.sources[0] = { ...evil.scope.sources[0], host: 'evil.example\u202e<b>x</b>', publisher: 'trusted-by-us', url: 'javascript:alert(1)', notes: ['n'.repeat(1000)] };
  evil.scope.account = ['a'.repeat(1000)];
  const p = parseFindings(evil);
  const src = p.scope.sources[0];
  assert.ok(!/[\u202e]/.test(src.host));
  assert.equal(src.publisher, 'other');
  assert.equal(src.publisherLabel, 'unrecognised publisher');
  assert.equal(src.url, '');
  assert.equal(src.notes[0].length, 240);
  assert.equal(p.scope.account[0].length, 300);
  assert.equal(parseFindings({ ...evil, scope: 'nope' }).scope.mode, 'project');
  assert.equal(parseFindings({ ...evil, scope: { mode: 'weird', sources: 'x' } }).scope.sources.length, 0);
});

test('only the duplicate list is removed from the text: the sources and the caveat stay', () => {
  const text = 'I found 1 table from api.worldbank.org.\n\n**What I found**\n1. A thing (likely)\n2. Another (likely)\n\n**Where this came from**\n- GDP growth (api.worldbank.org), downloaded 2026-10-05.\n\nThis data comes from the internet and has not been checked by us.';
  const out = withoutFindingList(text);
  assert.ok(!out.includes('A thing'));
  assert.ok(out.startsWith('I found 1 table from api.worldbank.org.'));
  assert.ok(out.includes('**Where this came from**'));
  assert.ok(!out.includes('has not been checked by us.'));   // said once, in the notice above the cards
  assert.equal(withoutFindingList('x\n\n**What I found**\n1. a'), 'x');
  assert.equal(withoutFindingList('plain\n\nThis data comes from the internet and has not been checked by us.'), 'plain');
});

test('an online run shows its own steps, with real detail', () => {
  let s = reduceSteps(undefined, { step: 'find', mode: 'online', state: 'running' });
  assert.deepEqual(s.map((x) => x.id), STEP_DEFS_ONLINE.map((x) => x.id));
  assert.equal(s[0].state, 'running');
  s = reduceSteps(s, { step: 'find', mode: 'online', state: 'done', candidates: 6, sources: ['data.gov.au', 'open.canada.ca'] });
  assert.equal(s[0].detail, '6 possible sources (data.gov.au, open.canada.ca)');
  s = reduceSteps(s, { step: 'fetch', mode: 'online', state: 'running', done: 1, total: 5, host: 'data.example.org' });
  assert.equal(s[0].state, 'done');
  assert.equal(s[1].detail, 'data.example.org (2 of 5)');
  s = reduceSteps(s, { step: 'clean', mode: 'online', state: 'done', tables: 2, rows: 4120 });
  assert.equal(s[2].detail, '2 tables, 4,120 rows');
  assert.equal(s[1].state, 'done');
  s = reduceSteps(s, { step: 'profile', mode: 'online', state: 'running', detail: '2 tables' });
  s = reduceSteps(s, { step: 'analyse', mode: 'online', state: 'running', done: 5, total: 20 });
  assert.equal(s[4].detail, '5 of about 20 checks');
  s = reduceSteps(s, { step: 'write', mode: 'online', state: 'running' });
  assert.deepEqual(s.map((x) => x.state), ['done', 'done', 'done', 'done', 'done', 'pending', 'running'].map((x, i) => (i === 5 ? 'done' : x)));
  assert.equal(discoveryStatus({ step: 'fetch', mode: 'online', host: 'a.org', done: 0, total: 3 }), 'Downloading it: a.org (1 of 3)');
  assert.equal(discoveryStatus({ step: 'find', mode: 'online', state: 'running' }), 'Finding the data…');
  assert.equal(discoveryStatus({ mode: 'online' }), 'Looking for the data online…');
  assert.equal(discoveryStatus({}), 'Looking through your data…');
  // the user's own data keeps its own list
  assert.deepEqual(reduceSteps(undefined, { step: 'load', state: 'running' }).map((x) => x.id), ['load', 'profile', 'analyse', 'rank', 'write']);
});

test('the online route is recognised as a discovery route', () => {
  assert.equal(isDiscoveryRoute('online_discovery:data_link'), true);
  assert.equal(isDiscoveryRoute('online_discovery:public_data'), true);
  assert.equal(isDiscoveryRoute('object_query:orders'), false);
});

// ---- forecasts ---------------------------------------------------------------------------------------------------------

const fcFixture = JSON.parse(readFileSync(new URL('./fixtures/findings.forecast.json', import.meta.url), 'utf8'));
const fcParsed = parseFindings(fcFixture.findings);
const fcCard = fcParsed.findings[0];

test('a real forecast payload parses: history, forecast and a range that brackets it', () => {
  assert.equal(fcParsed.findings.length, 1);
  assert.equal(fcCard.kind, 'forecast');
  assert.equal(fcCard.kindLabel, 'Forecast');
  assert.equal(fcCard.visual.type, 'forecast');
  const v = fcCard.visual;
  assert.equal(v.x.length, v.history.length + v.forecast.length);
  assert.equal(v.forecast.length, 3);
  v.forecast.forEach((f, i) => assert.ok(v.low[i] <= f && f <= v.high[i]));
  assert.ok(/80% range/.test(fcCard.figures[0].value));
  assert.ok(['likely', 'check'].includes(fcCard.confidence)); // a forecast is never "confirmed" or "strong"
});

test('forecast geometry joins the forecast to the last point and shades the range', () => {
  const g = forecastGeometry(fcCard.visual, 600);
  const v = fcCard.visual;
  assert.equal(g.points.length, v.history.length + v.forecast.length);
  assert.equal(g.points.filter((p) => p.future).length, 3);
  assert.ok(g.forecastPath.startsWith(`M${g.points[v.history.length - 1].x.toFixed(1)}`)); // starts where the history ends
  assert.ok(g.bandPath.endsWith('Z'));
  assert.ok(g.splitX < g.points[g.points.length - 1].x);
  for (const p of g.points) assert.ok(p.x >= g.plot.l - 0.1 && p.x <= g.plot.r + 0.1 && p.y >= g.plot.t - 0.1 && p.y <= g.plot.b + 0.1, `${p.i} inside the plot`);
  const last = g.points[g.points.length - 1];
  assert.ok(last.lowLabel && last.highLabel);
});

test('the forecast has a text alternative that says the range', () => {
  const alt = chartAlt(fcCard);
  assert.match(alt, /forecast for 3 more periods/);
  assert.match(alt, /80% range of/);
});

test('a malformed forecast gives no chart instead of a broken one', () => {
  const v = fcFixture.findings.findings[0].visual;
  const bad = (patch) => parseVisual({ ...v, ...patch });
  assert.ok(parseVisual(v));
  assert.equal(bad({ low: v.low.slice(1) }), null); // lengths must agree
  assert.equal(bad({ history: v.history.slice(0, 2) }), null);
  assert.equal(bad({ forecast: [...v.forecast.slice(0, 2), NaN] }), null);
  assert.equal(bad({ low: v.low.map((x) => x + 1e9) }), null); // the range must bracket the forecast
  assert.equal(bad({ x: v.x.slice(1) }), null);
  assert.equal(bad({ forecast: Array(60).fill(1), low: Array(60).fill(0), high: Array(60).fill(2) }), null); // capped, then it no longer lines up
});

test('forecast text keeps the sentence and the caveats and drops the list the card already shows', () => {
  const shown = withoutFindingList(fcFixture.text);
  assert.ok(shown.startsWith('Revenue is expected to be about'));
  assert.ok(!shown.includes('**What the forecast says**'));
  assert.ok(!/- (October|November|December) 2025/.test(shown));
  assert.match(shown, /\*\*Worth knowing\*\*/);
});

test('the forecast route is a discovery route, so its steps and cards show', () => {
  assert.equal(isDiscoveryRoute('data_forecast:orders'), true);
  assert.equal(isDiscoveryRoute('data_blend:orders'), true);
  assert.equal(isDiscoveryRoute('object_query:orders'), false);
});


// ---- Phase 1 math findings -------------------------------------------------------------------------------------------
const mathSample = JSON.parse(readFileSync(new URL('./fixtures/findings.math.json', import.meta.url), 'utf8'));
test('math sample run parses regression, forecast, and unwired what-if', () => {
  const m = parseFindings(mathSample);
  assert.equal(m.findings.length, 3);
  assert.equal(m.findings[0].math.method, 'regression');
  assert.equal(m.findings[1].math.method, 'forecast');
  assert.equal(m.findings[2].math.mathStatus, 'unwired');
  assert.equal(m.mathSteps.length, 3);
  assert.ok(m.findings[0].visual?.type === 'scatter');
  assert.ok(m.findings[1].visual?.type === 'forecast');
});
