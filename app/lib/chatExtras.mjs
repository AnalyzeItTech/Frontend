// Pure helpers for rich research answers: validating the extras the Model attaches to `final`
// (charts / map places / follow-ups), chart geometry, markdown tables and safe links.
// Everything here is defensive: the payload crosses a network boundary and must never crash the UI.

export const SERIES_COLORS = ['#E3836C', '#5B8DEF', '#3FB68B', '#B58CE8', '#E0B04A', '#7A8896'];

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function parseExtras(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const charts = [];
  for (const raw of Array.isArray(p.charts) ? p.charts.slice(0, 3) : []) {
    if (!raw || typeof raw !== 'object') continue;
    const series = [];
    for (const s of Array.isArray(raw.series) ? raw.series.slice(0, 6) : []) {
      const points = (Array.isArray(s?.points) ? s.points : [])
        .filter((pt) => Array.isArray(pt) && finite(pt[0]) && finite(pt[1]))
        .slice(0, 400)
        .map((pt) => [pt[0], pt[1]]);
      if (points.length) series.push({ name: String(s.name || '').slice(0, 40) || 'Series', points });
    }
    if (!series.length) continue;
    charts.push({
      type: raw.type === 'bar' ? 'bar' : 'line',
      title: String(raw.title || '').slice(0, 120),
      unit: String(raw.unit || '').slice(0, 40),
      xLabel: String(raw.x_label || '').slice(0, 30),
      source: String(raw.source || '').slice(0, 60),
      sourceUrl: /^https?:\/\//i.test(String(raw.source_url || '')) ? String(raw.source_url) : '',
      series,
    });
  }

  const places = [];
  for (const pl of Array.isArray(p.places) ? p.places.slice(0, 8) : []) {
    const lat = Number(pl?.lat);
    const lon = Number(pl?.lon ?? pl?.lng);
    if (!finite(lat) || !finite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    places.push({ name: String(pl.name || '').slice(0, 80) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon });
  }

  const suggestions = [];
  for (const s of Array.isArray(p.suggestions) ? p.suggestions : []) {
    const t = typeof s === 'string' ? s.trim() : '';
    if (t.length >= 3 && t.length <= 140 && !suggestions.includes(t)) suggestions.push(t);
    if (suggestions.length >= 4) break;
  }
  return { charts, places, suggestions };
}

/** "Nice" axis ticks: [min..max] split into ~count round steps. */
export function niceTicks(min, max, count = 5) {
  if (!finite(min) || !finite(max)) return [0, 1];
  if (min === max) {
    const d = Math.abs(min) || 1;
    return [min - d, min, min + d];
  }
  const span = max - min;
  const rough = span / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  // Walk up to (and including) the first tick at or above max so the axis always covers the data.
  for (let v = start; ticks.length < 12; v += step) {
    const t = Math.round(v / step) * step;
    ticks.push(t);
    if (t >= max) break;
  }
  return ticks;
}

/** Everything the SVG needs, computed once and testable without a DOM. */
export function chartGeometry(chart, width = 560, height = 240, pad = { l: 52, r: 16, t: 12, b: 28 }) {
  const all = chart.series.flatMap((s) => s.points);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yTicks = niceTicks(Math.min(...ys, ...(chart.type === 'bar' ? [0] : [])), Math.max(...ys), 5);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const sx = (x) => pad.l + (xMax === xMin ? iw / 2 : ((x - xMin) / (xMax - xMin)) * iw);
  const sy = (y) => pad.t + ih - (yMax === yMin ? ih / 2 : ((y - yMin) / (yMax - yMin)) * ih);
  const series = chart.series.map((s, i) => {
    const pts = s.points.map(([x, y]) => ({ x: sx(x), y: sy(y), xv: x, yv: y }));
    return {
      name: s.name,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points: pts,
      d: pts.map((p, j) => `${j ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''),
    };
  });
  const xTickCount = Math.min(6, new Set(xs).size);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const v = xTickCount === 1 ? xMin : Math.round(xMin + ((xMax - xMin) * i) / (xTickCount - 1));
    return { v, x: sx(v) };
  });
  return {
    width, height, pad, series,
    yTicks: yTicks.map((v) => ({ v, y: sy(v) })),
    xTicks,
    baselineY: sy(Math.max(yMin, Math.min(0, yMax))),
  };
}

export function formatValue(v, unit = '') {
  if (!finite(v)) return '';
  const a = Math.abs(v);
  if (unit.startsWith('%')) return `${v.toFixed(1)}%`;
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${Math.round(v).toLocaleString('en-US')}`;
  return Number.isInteger(v) ? String(v) : v.toFixed(a < 10 ? 2 : 1);
}

/** Only http(s)/mailto links: model output and web text are untrusted (blocks javascript: etc.). */
export function safeHref(url) {
  const u = String(url || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : null;
}

const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
// A separator row is only meaningful if it has pipes and every cell is dashes with optional colons.
const isSeparator = (line) =>
  line.includes('|') && line.trim().replace(/^\||\|$/g, '').split('|').every((c) => /^\s*:?-+:?\s*$/.test(c));

/** Parse a GitHub-style pipe table starting at lines[i]. Returns {header, align, rows, next} or null. */
export function parseTableAt(lines, i) {
  if (i + 1 >= lines.length || !lines[i].includes('|') || !isSeparator(lines[i + 1])) return null;
  const header = splitRow(lines[i]);
  const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));
  const rows = [];
  let j = i + 2;
  while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
    const cells = splitRow(lines[j]);
    rows.push(header.map((_, k) => cells[k] ?? ''));
    j += 1;
  }
  return { header, align, rows, next: j };
}
