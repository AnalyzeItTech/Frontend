// Pure helpers for discovery findings: validating the payload the Model attaches to `final`, chart geometry, plain-language
// labels, and the live step list. Everything here is defensive: the payload crosses a network boundary, may contain text that came
// from a user's data or from the internet, and must never be able to crash the page or inject markup. Strings are plain text
// (React renders them as text nodes), numbers must be finite, every list is capped, and an unknown version means "no cards".

import { niceTicks } from './chatExtras.mjs';

export const MAX_FINDINGS = 8;
export const MAX_POINTS = 72;
export const MAX_BARS = 12;
export const MAX_SCATTER = 150;
export const MAX_FIGURES = 14;
export const MAX_FORECAST = 24;

const KINDS = new Set(['change', 'trend', 'gap', 'concentration', 'outlier', 'correlation', 'quality', 'seasonal', 'run', 'forecast']);
const CONFIDENCE = {
  confirmed: { label: 'Confirmed in the data', tone: 'ok' },
  fact: { label: 'Confirmed in the data', tone: 'ok' },
  strong: { label: 'Strong evidence', tone: 'ok' },
  likely: { label: 'Likely', tone: 'info' },
  tentative: { label: 'Tentative', tone: 'warn' },
  check: { label: 'Worth checking', tone: 'warn' },
};
const KIND_LABELS = {
  change: 'Sudden change',
  trend: 'Steady trend',
  gap: 'Difference between groups',
  concentration: 'Depends on one group',
  outlier: 'Unusual value',
  correlation: 'Move together',
  quality: 'Data quality',
  seasonal: 'Repeating pattern',
  run: 'Lasting shift',
  forecast: 'Forecast',
};

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const num = (v) => (finite(v) ? v : null);
const int = (v) => (Number.isInteger(v) ? v : null);

// Control, zero-width, bidi and line-separator characters, built from code points so the source holds no invisible characters.
const CONTROL_RANGES = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0xfeff, 0xfeff],
];
const CONTROL = new RegExp(`[${CONTROL_RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join('')}]`, 'g');

/** Plain text only, one line, bounded. */
const str = (v, max) => (typeof v === 'string' ? v.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const strList = (v, count, max) => (Array.isArray(v) ? v.map((s) => str(s, max)).filter(Boolean).slice(0, count) : []);

export function safeUrl(u) {
  try {
    const url = new URL(String(u));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

// ---- payload -------------------------------------------------------------------------------------------------------------

function parseLine(v) {
  const x = Array.isArray(v.x) ? v.x.slice(0, MAX_POINTS).map((s) => str(s, 24)) : [];
  if (x.length < 2) return null;
  const series = [];
  for (const s of Array.isArray(v.series) ? v.series.slice(0, 4) : []) {
    const values = (Array.isArray(s?.values) ? s.values : []).slice(0, x.length).map(num);
    while (values.length < x.length) values.push(null);
    if (values.filter((n) => n !== null).length < 2) continue;
    series.push({ name: str(s.name, 60), role: ['main', 'baseline', 'fit'].includes(s.role) ? s.role : 'main', values });
  }
  if (!series.some((s) => s.role === 'main')) return null;
  const highlight = (Array.isArray(v.highlight) ? v.highlight : []).filter((i) => Number.isInteger(i) && i >= 0 && i < x.length).slice(0, 4);
  return { type: 'line', x, series, highlight, yLabel: str(v.y_label, 60), format: v.format === 'percent' ? 'percent' : 'number' };
}

function parseForecast(v) {
  const list = (a, max) => (Array.isArray(a) ? a.slice(0, max).map(num) : []);
  const forecast = list(v.forecast, MAX_FORECAST);
  const low = list(v.low, MAX_FORECAST);
  const high = list(v.high, MAX_FORECAST);
  const history = list(v.history, MAX_POINTS);
  const x = (Array.isArray(v.x) ? v.x.slice(0, MAX_POINTS + MAX_FORECAST) : []).map((s) => str(s, 24));
  const n = forecast.length;
  const all = [...forecast, ...low, ...high, ...history];
  if (n < 1 || low.length !== n || high.length !== n || history.length < 3 || x.length !== history.length + n || all.some((q) => q === null)) return null;
  if (low.some((l, i) => l > forecast[i] + 1e-9) || high.some((h, i) => h < forecast[i] - 1e-9)) return null;
  return { type: 'forecast', x, history, forecast, low, high, yLabel: str(v.y_label, 60), format: v.format === 'percent' ? 'percent' : 'number' };
}

function parseBars(v) {
  const items = (Array.isArray(v.items) ? v.items : [])
    .slice(0, MAX_BARS)
    .map((i) => ({ label: str(i?.label, 40), value: num(i?.value), n: int(i?.n), highlight: i?.highlight === true }))
    .filter((i) => i.label && i.value !== null);
  if (items.length < 2) return null;
  return { type: 'bars', items, baseline: num(v.baseline), baselineLabel: str(v.baseline_label, 30), format: v.format === 'percent' ? 'percent' : 'number' };
}

function parseScatter(v) {
  const points = (Array.isArray(v.points) ? v.points : [])
    .slice(0, MAX_SCATTER)
    .filter((p) => Array.isArray(p) && finite(p[0]) && finite(p[1]))
    .map((p) => [p[0], p[1]]);
  if (points.length < 10) return null;
  const fit =
    Array.isArray(v.fit) && v.fit.length === 2 && v.fit.every((p) => Array.isArray(p) && finite(p[0]) && finite(p[1]))
      ? v.fit.map((p) => [p[0], p[1]])
      : null;
  return { type: 'scatter', points, xLabel: str(v.x_label, 40), yLabel: str(v.y_label, 40), fit, r: num(v.r) };
}

function parseBand(v) {
  const low = num(v.low);
  const high = num(v.high);
  const center = num(v.center);
  const values = (Array.isArray(v.values) ? v.values : [])
    .slice(0, 12)
    .map((p) => ({ label: str(p?.label, 40), value: num(p?.value), flag: p?.flag === true }))
    .filter((p) => p.value !== null);
  if (low === null || high === null || center === null || !values.length) return null;
  return { type: 'band', low, high, center, values, format: v.format === 'percent' ? 'percent' : 'number' };
}

function parseMeter(v) {
  const parts = (Array.isArray(v.parts) ? v.parts : [])
    .slice(0, 4)
    .map((p) => ({ label: str(p?.label, 30), value: num(p?.value), tone: p?.tone === 'warn' ? 'warn' : 'ok' }))
    .filter((p) => p.label && p.value !== null && p.value >= 0);
  const total = num(v.total);
  if (!parts.length || total === null || total <= 0) return null;
  return { type: 'meter', parts, total };
}

export function parseVisual(v) {
  if (!v || typeof v !== 'object') return null;
  switch (v.type) {
    case 'line':
      return parseLine(v);
    case 'bars':
      return parseBars(v);
    case 'scatter':
      return parseScatter(v);
    case 'band':
      return parseBand(v);
    case 'meter':
      return parseMeter(v);
    case 'forecast':
      return parseForecast(v);
    default:
      return null;
  }
}

function parseFinding(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const title = str(raw.title, 160);
  if (!title) return null;
  const kind = KINDS.has(raw.kind) ? raw.kind : 'other';
  const conf = CONFIDENCE[raw.confidence] ? raw.confidence : 'likely';
  const src = raw.source && typeof raw.source === 'object' ? raw.source : {};
  return {
    id: str(raw.id, 24) || `f${index + 1}`,
    kind,
    kindLabel: str(raw.kind_label, 40) || KIND_LABELS[kind] || 'Finding',
    title,
    soWhat: str(raw.so_what, 360),
    headline: str(raw.headline, 300),
    reasoning: strList(raw.reasoning, 6, 400),
    why: strList(raw.why, 4, 240),
    confidence: conf,
    confidenceLabel: CONFIDENCE[conf].label,
    confidenceTone: CONFIDENCE[conf].tone,
    confidenceNote: str(raw.confidence_note, 160),
    strength: finite(raw.strength) ? Math.max(0, Math.min(1, raw.strength)) : 0,
    visual: parseVisual(raw.visual),
    figures: (Array.isArray(raw.figures) ? raw.figures : [])
      .slice(0, MAX_FIGURES)
      .map((f) => ({ label: str(f?.label, 60), value: str(f?.value, 40), n: int(f?.n), note: str(f?.note, 80) }))
      .filter((f) => f.label && f.value),
    sql: typeof raw.sql === 'string' ? raw.sql.split(String.fromCharCode(0)).join('').slice(0, 4000) : '',
    followups: strList(raw.followups, 3, 140),
    source: {
      table: str(src.table, 60),
      origin: src.origin === 'online' ? 'online' : 'project',
      url: safeUrl(src.url),
    },
    provenance: parseProvenance(raw.provenance),
  };
}

const PUBLISHERS = { government: 'government', international: 'international organisation', university: 'university', research: 'research or open-data platform', other: 'unrecognised publisher' };

function parseProvenance(p) {
  if (!p || typeof p !== 'object') return null;
  const host = str(p.host, 80);
  if (!host) return null;
  return {
    host,
    publisher: PUBLISHERS[p.publisher] ? p.publisher : 'other',
    publisherLabel: PUBLISHERS[p.publisher] || PUBLISHERS.other,
    fetchedAt: str(p.fetched_at, 24),
    latest: str(p.latest, 10) || null,
  };
}

function parseScope(sc) {
  const scope = sc && typeof sc === 'object' ? sc : {};
  const sources = (Array.isArray(scope.sources) ? scope.sources : []).slice(0, 6).map((x) => ({
    table: str(x?.table, 60),
    title: str(x?.title, 120),
    url: safeUrl(x?.url),
    host: str(x?.host, 80),
    publisher: PUBLISHERS[x?.publisher] ? x.publisher : 'other',
    publisherLabel: PUBLISHERS[x?.publisher] || PUBLISHERS.other,
    fetchedAt: str(x?.fetched_at, 24),
    latest: str(x?.latest, 10) || null,
    rowsLoaded: int(x?.rows_loaded) ?? 0,
    rowsTotal: int(x?.rows_total),
    notes: strList(x?.notes, 6, 240),
  }));
  return { mode: scope.mode === 'online' ? 'online' : 'project', sources, account: strList(scope.account, 6, 300) };
}

/** The `findings` object of a final payload, rebuilt from a whitelist. Null when absent, from a newer schema, or unusable. */
export function parseFindings(payload) {
  if (!payload || typeof payload !== 'object' || payload.version !== 1) return null;
  const findings = (Array.isArray(payload.findings) ? payload.findings : [])
    .slice(0, MAX_FINDINGS)
    .map(parseFinding)
    .filter(Boolean);
  const c = payload.checked && typeof payload.checked === 'object' ? payload.checked : {};
  const analyses = int(c.analyses) ?? 0;
  if (!findings.length && analyses <= 0) return null;
  return {
    findings,
    checked: {
      analyses: Math.max(0, analyses),
      queries: Math.max(0, int(c.queries) ?? 0),
      byKind: Object.fromEntries(
        Object.entries(c.by_kind && typeof c.by_kind === 'object' ? c.by_kind : {})
          .filter(([k, n]) => typeof k === 'string' && k.length <= 24 && Number.isInteger(n) && n >= 0)
          .slice(0, 12),
      ),
      tables: (Array.isArray(c.tables) ? c.tables : [])
        .slice(0, 6)
        .map((t) => ({ name: str(t?.name, 60), rows: Math.max(0, int(t?.rows) ?? 0), total: Math.max(0, int(t?.total) ?? 0) }))
        .filter((t) => t.name),
    },
    scope: parseScope(payload.scope),
    partial: (Array.isArray(payload.partial) ? payload.partial : [])
      .slice(0, 6)
      .filter((p) => Array.isArray(p) && Number.isInteger(p[1]) && Number.isInteger(p[2]))
      .map((p) => ({ table: str(p[0], 60), loaded: p[1], total: p[2] })),
    notes: strList(payload.notes, 4, 240),
  };
}

export function confidenceMeta(c) {
  return CONFIDENCE[c] || CONFIDENCE.likely;
}

/** One line under the heading: what was looked at, honestly. */
export function checkedLine(parsed) {
  if (!parsed) return '';
  const { analyses, tables } = parsed.checked;
  const found = parsed.findings.length;
  const t = tables.length;
  const where = t ? ` across ${t} table${t === 1 ? '' : 's'}` : '';
  if (!analyses) return found ? `${found} finding${found === 1 ? '' : 's'}` : '';
  return `Checked ${analyses} thing${analyses === 1 ? '' : 's'}${where} · ${found} stood out`;
}

const CHECK_LABELS = {
  change: ['change over time', 'changes over time'],
  trend: ['trend', 'trends'],
  gap: ['comparison between groups', 'comparisons between groups'],
  concentration: ['check for dependence on one group', 'checks for dependence on one group'],
  outlier: ['check for unusual values', 'checks for unusual values'],
  correlation: ['relationship between numbers', 'relationships between numbers'],
  quality: ['data-quality check', 'data-quality checks'],
  seasonal: ['repeating-pattern check', 'repeating-pattern checks'],
  run: ['lasting-shift check', 'lasting-shift checks'],
};

/** "6 changes over time, 2 trends, …": what was looked at, so 'nothing else stood out' means something. */
export function breakdownLine(parsed) {
  if (!parsed) return '';
  const parts = Object.entries(parsed.checked.byKind)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const l = CHECK_LABELS[k] || ['check', 'checks'];
      return `${n} ${n === 1 ? l[0] : l[1]}`;
    });
  return parts.join(', ');
}

/** The notice above online findings: where the data came from and that nobody has checked it. Empty for the user's own data. */
export function onlineNotice(parsed) {
  if (!parsed || parsed.scope.mode !== 'online') return '';
  const hosts = [...new Set(parsed.scope.sources.map((s) => s.host).filter(Boolean))];
  return `This data comes from the internet${hosts.length ? ` (${hosts.slice(0, 3).join(', ')})` : ''} and has not been checked by us. Check anything important at the source.`;
}

/** "api.worldbank.org · international organisation · downloaded 5 Oct 2026", the small line on a card made from online data. */
export function provenanceLine(f) {
  const p = f?.provenance;
  if (!p) return '';
  const when = p.fetchedAt ? new Date(p.fetchedAt.length === 17 ? p.fetchedAt.replace('Z', ':00Z') : p.fetchedAt) : null;
  const date = when && !Number.isNaN(+when) ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
  return [p.host, p.publisherLabel, date ? `downloaded ${date}` : ''].filter(Boolean).join(' · ');
}

/** The facts about one online source, as lines for the working panel: what it is, who publishes it, when it was fetched, how fresh it is. */
export function sourceLines(src) {
  if (!src) return [];
  const when = src.fetchedAt ? new Date(src.fetchedAt.length === 17 ? src.fetchedAt.replace('Z', ':00Z') : src.fetchedAt) : null;
  const date = when && !Number.isNaN(+when) ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
  const rows = src.rowsTotal && src.rowsTotal > src.rowsLoaded
    ? `${src.rowsLoaded.toLocaleString('en-US')} of ${src.rowsTotal.toLocaleString('en-US')} rows read`
    : src.rowsTotal === null && src.rowsLoaded
      ? `the first ${src.rowsLoaded.toLocaleString('en-US')} rows read (the file is larger)`
      : `${src.rowsLoaded.toLocaleString('en-US')} rows read`;
  const newest = src.latest ? `Newest observation: ${src.latest.endsWith('-01-01') ? src.latest.slice(0, 4) : src.latest.slice(0, 7)}` : '';
  return [src.title || src.host, `${src.host} · ${src.publisherLabel}`, date ? `Downloaded ${date}` : '', newest, rows].filter(Boolean);
}

export function partialLine(parsed) {
  if (!parsed || !parsed.partial.length) return '';
  const parts = parsed.partial.map((p) => `${p.table}: ${p.loaded.toLocaleString('en-US')} of ${p.total.toLocaleString('en-US')} rows`);
  return `Only part of the data could be read (${parts.join('; ')}). These findings cover only those rows.`;
}

// ---- formatting ----------------------------------------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function trim(n, digits) {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function formatNumber(v, format = 'number') {
  if (!finite(v)) return '–';
  if (format === 'percent') {
    const p = v * 100;
    return `${trim(p, Math.abs(p) >= 10 ? 0 : 1)}%`;
  }
  const a = Math.abs(v);
  if (a >= 1e9) return `${trim(v / 1e9, 1)}B`;
  if (a >= 1e6) return `${trim(v / 1e6, 1)}M`;
  if (a >= 1e4) return `${trim(v / 1e3, a >= 1e5 ? 0 : 1)}K`;
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 100) return trim(v, 0);
  if (a >= 1) return trim(v, 2);
  if (a === 0) return '0';
  return trim(v, 3);
}

/** "2024-03" → "Mar ’24", "2024-W12" → "W12 ’24", "2024-Q2" → "Q2 ’24"; anything else is shortened. */
export function formatPeriod(label) {
  const s = String(label ?? '');
  let m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${MONTHS[+m[2] - 1]} ’${m[1].slice(2)}`;
  m = /^(\d{4})-W(\d{2})$/.exec(s);
  if (m) return `W${+m[2]} ’${m[1].slice(2)}`;
  m = /^(\d{4})-Q([1-4])$/.exec(s);
  if (m) return `Q${m[2]} ’${m[1].slice(2)}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${+m[3]} ${MONTHS[+m[2] - 1]}`;
  return s.length > 12 ? `${s.slice(0, 11)}…` : s;
}

// ---- geometry (pure; the components only draw what these return) ---------------------------------------------------------

/** Axis range with a little air around the data, and only the round ticks that fall inside it (no empty -200..0 band). */
function axisFor(lo, hi, count) {
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.06;
  const min = lo - pad;
  const max = hi + pad;
  let ticks = niceTicks(lo, hi, count).filter((t) => t >= min - 1e-9 && t <= max + 1e-9);
  if (ticks.length < 2) ticks = [lo, hi];
  return { min, max, ticks };
}

const linePath = (pts) => {
  let d = '';
  let pen = false;
  for (const p of pts) {
    if (p === null) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
};

export function lineGeometry(v, width, height = 190, pad = { l: 46, r: 14, t: 14, b: 26 }) {
  const n = v.x.length;
  const plotW = Math.max(40, width - pad.l - pad.r);
  const plotH = Math.max(40, height - pad.t - pad.b);
  const all = v.series.flatMap((s) => s.values).filter(finite);
  const { min: yMin, max: yMax, ticks } = axisFor(Math.min(...all), Math.max(...all), 4);
  const X = (i) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const Y = (val) => pad.t + (1 - (val - yMin) / (yMax - yMin || 1)) * plotH;
  const series = v.series.map((s) => {
    const pts = s.values.map((val, i) => (finite(val) ? { x: X(i), y: Y(val), i, v: val } : null));
    return { name: s.name, role: s.role, path: linePath(pts), points: pts.filter(Boolean) };
  });
  const main = series.find((s) => s.role === 'main');
  const maxLabels = Math.max(2, Math.floor(plotW / 58));
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const xTicks = [];
  for (let i = 0; i < n; i += step) xTicks.push({ x: X(i), label: formatPeriod(v.x[i]), i });
  return {
    width,
    height,
    plot: { l: pad.l, r: pad.l + plotW, t: pad.t, b: pad.t + plotH },
    series,
    xTicks,
    yTicks: ticks.map((t) => ({ y: Y(t), label: formatNumber(t, v.format) })),
    highlight: v.highlight
      .map((i) => {
        const p = main?.points.find((q) => q.i === i);
        return p ? { i, x: p.x, y: p.y, value: p.v, valueLabel: formatNumber(p.v, v.format), label: formatPeriod(v.x[i]) } : null;
      })
      .filter(Boolean),
  };
}

/** History, then the forecast joined to its last point, with the 80% range as a shaded band. Index i runs over history then forecast. */
export function forecastGeometry(v, width, height = 210, pad = { l: 46, r: 14, t: 14, b: 26 }) {
  const nh = v.history.length;
  const n = nh + v.forecast.length;
  const plotW = Math.max(40, width - pad.l - pad.r);
  const plotH = Math.max(40, height - pad.t - pad.b);
  const { min: yMin, max: yMax, ticks } = axisFor(Math.min(...v.history, ...v.low), Math.max(...v.history, ...v.high), 4);
  const X = (i) => pad.l + (i / (n - 1)) * plotW;
  const Y = (val) => pad.t + (1 - (val - yMin) / (yMax - yMin || 1)) * plotH;
  const hist = v.history.map((val, i) => ({ x: X(i), y: Y(val), i, v: val, future: false }));
  const fut = v.forecast.map((val, j) => ({ x: X(nh + j), y: Y(val), i: nh + j, v: val, low: v.low[j], high: v.high[j], lowLabel: formatNumber(v.low[j], v.format), highLabel: formatNumber(v.high[j], v.format), future: true }));
  const last = hist[nh - 1];
  const upper = [last, ...fut.map((p, j) => ({ x: p.x, y: Y(v.high[j]) }))];
  const lower = [last, ...fut.map((p, j) => ({ x: p.x, y: Y(v.low[j]) }))].reverse();
  const poly = [...upper, ...lower].map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + 'Z';
  const maxLabels = Math.max(2, Math.floor(plotW / 62));
  const step = Math.max(1, Math.ceil(n / maxLabels));
  const xTicks = [];
  for (let i = 0; i < n; i += step) xTicks.push({ x: X(i), label: formatPeriod(v.x[i]), i });
  return {
    width,
    height,
    plot: { l: pad.l, r: pad.l + plotW, t: pad.t, b: pad.t + plotH },
    historyPath: linePath(hist),
    forecastPath: linePath([last, ...fut]),
    bandPath: poly,
    splitX: last.x,
    points: [...hist, ...fut].map((p) => ({ ...p, valueLabel: formatNumber(p.v, v.format), label: formatPeriod(v.x[p.i]) })),
    xTicks,
    yTicks: ticks.map((t) => ({ y: Y(t), label: formatNumber(t, v.format) })),
  };
}

export function barsGeometry(v) {
  const max = Math.max(...v.items.map((i) => Math.abs(i.value)), v.baseline !== null ? Math.abs(v.baseline) : 0, Number.EPSILON);
  return {
    rows: v.items.map((i) => ({
      label: i.label,
      value: i.value,
      valueLabel: formatNumber(i.value, v.format),
      n: i.n,
      highlight: i.highlight,
      pct: Math.max(i.value === 0 ? 0 : 1.5, (Math.max(0, i.value) / max) * 100),
    })),
    baselinePct: v.baseline !== null ? (Math.max(0, v.baseline) / max) * 100 : null,
    baselineLabel: v.baselineLabel,
    baselineValue: v.baseline !== null ? formatNumber(v.baseline, v.format) : '',
  };
}

export function meterGeometry(v) {
  // a tiny but real share (one repeated id in thousands) still gets a visible sliver
  return { parts: v.parts.map((p) => ({ ...p, pct: p.value > 0 ? Math.max(1.2, Math.min(100, (p.value / v.total) * 100)) : 0, valueLabel: formatNumber(p.value) })), total: v.total };
}

function clipSegment(p0, p1, box) {
  // Liang–Barsky: the part of the segment p0→p1 inside box, or null.
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  let t0 = 0;
  let t1 = 1;
  const tests = [
    [-dx, p0[0] - box.l],
    [dx, box.r - p0[0]],
    [-dy, p0[1] - box.t],
    [dy, box.b - p0[1]],
  ];
  for (const [p, q] of tests) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    [p0[0] + t0 * dx, p0[1] + t0 * dy],
    [p0[0] + t1 * dx, p0[1] + t1 * dy],
  ];
}

export function scatterGeometry(v, width, height = 210, pad = { l: 46, r: 14, t: 12, b: 30 }) {
  const plotW = Math.max(40, width - pad.l - pad.r);
  const plotH = Math.max(40, height - pad.t - pad.b);
  const xs = v.points.map((p) => p[0]);
  const ys = v.points.map((p) => p[1]);
  const ax = axisFor(Math.min(...xs), Math.max(...xs), 4);
  const ay = axisFor(Math.min(...ys), Math.max(...ys), 4);
  const xt = ax.ticks;
  const yt = ay.ticks;
  const [x0, x1] = [ax.min, ax.max];
  const [y0, y1] = [ay.min, ay.max];
  const X = (x) => pad.l + ((x - x0) / (x1 - x0 || 1)) * plotW;
  const Y = (y) => pad.t + (1 - (y - y0) / (y1 - y0 || 1)) * plotH;
  const box = { l: pad.l, r: pad.l + plotW, t: pad.t, b: pad.t + plotH };
  const fit = v.fit ? clipSegment([X(v.fit[0][0]), Y(v.fit[0][1])], [X(v.fit[1][0]), Y(v.fit[1][1])], box) : null;
  return {
    width,
    height,
    plot: box,
    points: v.points.map((p) => ({ x: X(p[0]), y: Y(p[1]) })),
    fit,
    xTicks: xt.map((t) => ({ x: X(t), label: formatNumber(t) })),
    yTicks: yt.map((t) => ({ y: Y(t), label: formatNumber(t) })),
  };
}

export function bandGeometry(v, width, pad = { l: 12, r: 12 }) {
  const all = [v.low, v.high, v.center, ...v.values.map((p) => p.value)];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const plotW = Math.max(40, width - pad.l - pad.r);
  const X = (val) => pad.l + ((val - lo) / span) * plotW;
  return {
    width,
    bandL: X(v.low),
    bandR: X(v.high),
    center: X(v.center),
    lowLabel: formatNumber(v.low, v.format),
    highLabel: formatNumber(v.high, v.format),
    centerLabel: formatNumber(v.center, v.format),
    points: v.values.map((p, i) => ({ x: X(p.value), row: i % 3, label: p.label, valueLabel: formatNumber(p.value, v.format), flag: p.flag })),
  };
}

/** A sentence a screen reader can use instead of the picture. */
export function chartAlt(f) {
  const v = f.visual;
  if (!v) return '';
  if (v.type === 'line') {
    const main = v.series.find((s) => s.role === 'main') || v.series[0];
    const vals = main.values.map((val, i) => ({ val, i })).filter((p) => finite(p.val));
    const hi = vals.reduce((a, b) => (b.val > a.val ? b : a));
    const lo = vals.reduce((a, b) => (b.val < a.val ? b : a));
    const marked = v.highlight.length
      ? ` Highlighted: ${v.highlight.map((i) => `${formatPeriod(v.x[i])} at ${formatNumber(main.values[i], v.format)}`).join(', ')}.`
      : '';
    return `Line chart of ${v.yLabel || main.name || 'values'} from ${formatPeriod(v.x[0])} to ${formatPeriod(v.x[v.x.length - 1])}.${marked} Highest ${formatNumber(hi.val, v.format)} in ${formatPeriod(v.x[hi.i])}, lowest ${formatNumber(lo.val, v.format)} in ${formatPeriod(v.x[lo.i])}.`;
  }
  if (v.type === 'forecast') {
    const j = v.forecast.length - 1;
    return `Line chart of ${v.yLabel || 'values'} from ${formatPeriod(v.x[0])} to ${formatPeriod(v.x[v.history.length - 1])}, then a forecast for ${v.forecast.length} more period${v.forecast.length === 1 ? '' : 's'}. The last forecast, for ${formatPeriod(v.x[v.history.length + j])}, is about ${formatNumber(v.forecast[j], v.format)}, with an 80% range of ${formatNumber(v.low[j], v.format)} to ${formatNumber(v.high[j], v.format)}.`;
  }
  if (v.type === 'bars') {
    const hi = v.items.reduce((a, b) => (b.value > a.value ? b : a));
    const lo = v.items.reduce((a, b) => (b.value < a.value ? b : a));
    return `Bar chart of ${v.items.length} groups. Highest: ${hi.label}, ${formatNumber(hi.value, v.format)}. Lowest: ${lo.label}, ${formatNumber(lo.value, v.format)}.`;
  }
  if (v.type === 'scatter') {
    const dir = v.r === null ? 'a' : v.r > 0 ? 'a rising' : 'a falling';
    return `Scatter plot of ${v.yLabel || 'one measure'} against ${v.xLabel || 'another'}, ${v.points.length} points, showing ${dir} relationship${v.r === null ? '' : ` (correlation ${v.r.toFixed(2)})`}.`;
  }
  if (v.type === 'band') {
    const odd = v.values.filter((p) => p.flag).map((p) => `${p.label} ${formatNumber(p.value, v.format)}`).join(', ') || 'none';
    return `Typical range ${formatNumber(v.low, v.format)} to ${formatNumber(v.high, v.format)}. Unusual values outside it: ${odd}.`;
  }
  if (v.type === 'meter') {
    return `${v.parts.map((p) => `${p.label}: ${formatNumber(p.value)}`).join('; ')} out of ${formatNumber(v.total)}.`;
  }
  return '';
}

/** Keyboard stepping over a chart's points: arrows move, Home/End jump; always stays in range. */
export function stepIndex(current, key, count) {
  if (count <= 0) return 0;
  const i = Number.isInteger(current) ? current : 0;
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(count - 1, i + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, i - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return Math.max(0, Math.min(count - 1, i));
}

// ---- live progress -------------------------------------------------------------------------------------------------------

export const STEP_DEFS = [
  { id: 'load', label: 'Reading your data' },
  { id: 'profile', label: 'Understanding the columns' },
  { id: 'analyse', label: 'Looking for patterns' },
  { id: 'rank', label: 'Picking what matters' },
  { id: 'write', label: 'Writing it up' },
];

export const STEP_DEFS_ONLINE = [
  { id: 'find', label: 'Finding the data' },
  { id: 'fetch', label: 'Downloading it' },
  { id: 'clean', label: 'Reading and cleaning it' },
  { id: 'profile', label: 'Understanding the columns' },
  { id: 'analyse', label: 'Looking for patterns' },
  { id: 'rank', label: 'Picking what matters' },
  { id: 'write', label: 'Writing it up' },
];

const ONLINE_ONLY = new Set(['find', 'fetch', 'clean']);
const labelOf = (id) => (STEP_DEFS_ONLINE.find((s) => s.id === id) || STEP_DEFS.find((s) => s.id === id) || {}).label;

function stepDetail(p) {
  const c = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '');
  switch (p.step) {
    case 'load':
      return p.state === 'done' && Number.isFinite(p.tables) ? `${c(p.tables)} table${p.tables === 1 ? '' : 's'}, ${c(p.rows)} rows` : '';
    case 'find':
      if (p.state === 'done') {
        const hosts = Array.isArray(p.sources) ? p.sources.map((h) => str(h, 40)).filter(Boolean).slice(0, 3).join(', ') : '';
        return Number.isFinite(p.candidates) ? `${c(p.candidates)} possible source${p.candidates === 1 ? '' : 's'}${hosts ? ` (${hosts})` : ''}` : '';
      }
      return '';
    case 'fetch':
      return str(p.host, 60) ? `${str(p.host, 60)}${Number.isFinite(p.total) && p.total > 0 ? ` (${c(Math.min(p.total, (p.done ?? 0) + 1))} of ${c(p.total)})` : ''}` : '';
    case 'clean':
      if (p.state === 'done') return Number.isFinite(p.tables) ? `${c(p.tables)} table${p.tables === 1 ? '' : 's'}, ${c(p.rows)} rows` : '';
      return str(p.host, 60);
    case 'profile':
      if (p.state === 'done') return Number.isFinite(p.tables) ? `${c(p.tables)} table${p.tables === 1 ? '' : 's'} understood` : '';
      return str(p.table, 40) && Number.isFinite(p.rows) ? `${str(p.table, 40)}: ${c(p.rows)} rows, ${c(p.cols)} columns` : '';
    case 'analyse':
      if (p.state === 'done') return Number.isFinite(p.done) ? `${c(p.done)} checks run` : '';
      return Number.isFinite(p.done) ? `${c(p.done)} of about ${c(Math.max(p.total ?? 0, p.done))} checks` : '';
    case 'rank':
      if (p.state === 'done') return Number.isFinite(p.found) ? `${c(p.found)} stood out` : '';
      return Number.isFinite(p.candidates) ? `${c(p.candidates)} candidates` : '';
    default:
      return '';
  }
}

/** Fold one `tool_progress` event of the discovery tool into the step list. Starting a step finishes the ones before it. */
export function reduceSteps(prev, payload) {
  const online = payload?.mode === 'online' || ONLINE_ONLY.has(payload?.step);
  const base = prev && prev.length ? prev : (online ? STEP_DEFS_ONLINE : STEP_DEFS).map((s) => ({ ...s, state: 'pending', detail: '' }));
  const idx = base.findIndex((s) => s.id === payload?.step);
  if (idx < 0) return base;
  const done = payload.state === 'done';
  return base.map((s, i) => {
    if (i < idx && s.state !== 'done') return { ...s, state: 'done' };
    if (i !== idx) return s;
    const detail = stepDetail(payload) || s.detail;
    return { ...s, state: done ? 'done' : 'running', detail };
  });
}

/** The one-line status while it runs. */
export function discoveryStatus(payload) {
  const label = labelOf(payload?.step);
  if (!label) return payload?.mode === 'online' ? 'Looking for the data online…' : 'Looking through your data…';
  const detail = stepDetail(payload);
  return detail ? `${label}: ${detail}` : `${label}…`;
}

export function isDiscoveryRoute(reason) {
  return typeof reason === 'string' && (reason.startsWith('data_discovery') || reason.startsWith('data_forecast') || reason.startsWith('data_blend') || reason.startsWith('online_discovery'));
}

/** The message text without its numbered 'What I found' list, for screens that draw the cards (copy and share keep the full text). Anything
 *  after the list, such as the sources and the caveat on online data, stays: those are not repeated by the cards. */
export function withoutFindingList(text) {
  if (typeof text !== 'string') return '';
  // the caveat on online data is shown once, in the notice above the cards
  const trimmed = text.replace(/\n\nThis data comes from the internet and has not been checked by us\.?\s*$/, '');
  // a forecast's figures are in its card: leave the sentence about what it says and the caveats
  const noFigures = trimmed.replace(/\n\n\*\*What the forecast says\*\*\n(?:- .*(?:\n|$))+/, '');
  if (noFigures !== trimmed) return noFigures.trimEnd();
  const start = trimmed.indexOf('\n\n**What I found**\n');
  if (start < 0) return trimmed;
  const rest = trimmed.slice(start + 2);
  const next = rest.indexOf('\n\n', rest.indexOf('\n') + 1);
  return (trimmed.slice(0, start) + (next >= 0 ? rest.slice(next) : '')).trimEnd();
}
