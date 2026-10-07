// Phase 1 math finding contract: productize existing Model compute tools on finding cards.
// Design methods → tools: Regression → linear_trend; Forecast → forecast_tool (Holt bands);
// What-if / stress → not wired yet — FE shows an honest placeholder until Backend sends a payload.
// Force-display method, assumptions, and params_used from pipeline payloads (stats_guards style).
// Do not invent live what-if numbers. No briefing UI, no code sandbox.

/** @typedef {'regression' | 'forecast' | 'what_if'} MathMethod */
/** @typedef {'done' | 'running' | 'failed' | 'unwired'} MathStepState */

export const MATH_METHODS = /** @type {const} */ (['regression', 'forecast', 'what_if']);

/** Tool names the Model already exposes, keyed to Design method labels. */
export const TOOL_TO_METHOD = {
  linear_trend: 'regression',
  correlation: 'regression',
  correlation_finder: 'regression',
  forecast_tool: 'forecast',
  forecasting_ml: 'forecast',
  arima: 'forecast', // honestly Holt in Model today — label stays Forecast
  stress: 'what_if',
  what_if: 'what_if',
  scenario: 'what_if',
};

export const METHOD_LABEL = {
  regression: 'Regression',
  forecast: 'Forecast',
  what_if: 'What-if',
};

export const DEFAULT_CAVEAT = {
  regression: 'Descriptive fit on your series — not a trading signal.',
  forecast: 'Projection assumes the future behaves like the past — not a trading signal.',
  what_if: 'Scenario on your inputs — not a trading signal.',
};

/** Honesty ban list for math chrome / card copy (also asserted in tests). Built from parts so this file is not itself a hit. */
const ban = (parts, flags = 'i') => new RegExp(parts.join(''), flags);
export const MATH_BANNED = [
  ban(['Black-?', 'Scholes']),
  ban(['\\b', 'Greeks', '\\b']),
  ban(['\\b', 'alpha', '\\b']),
  ban(['\\b', 'edge', '\\b']),
  ban(['low', ' ', 'latency']),
  ban(['\\b', 'execution', '\\b']),
  ban(['\\b', 'desk', '\\b']),
  ban(['signal', ' to ', 'trade']),
];

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const CONTROL_RANGES = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0xfeff, 0xfeff],
];
const CONTROL = new RegExp(`[${CONTROL_RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join('')}]`, 'g');
const str = (v, max) => (typeof v === 'string' ? v.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const strList = (v, count, max) => (Array.isArray(v) ? v.map((s) => str(s, max)).filter(Boolean).slice(0, count) : []);

/**
 * Map a Backend tool name or method string to a Design method.
 * @param {unknown} tool
 * @param {unknown} method
 * @param {unknown} kind
 * @returns {MathMethod | null}
 */
export function resolveMathMethod(tool, method, kind) {
  const m = str(method, 24).toLowerCase().replace(/-/g, '_');
  if (m === 'regression' || m === 'forecast' || m === 'what_if' || m === 'whatif') {
    return m === 'whatif' ? 'what_if' : /** @type {MathMethod} */ (m);
  }
  const t = str(tool, 40).toLowerCase();
  if (TOOL_TO_METHOD[t]) return TOOL_TO_METHOD[t];
  const k = str(kind, 24).toLowerCase();
  if (k === 'regression' || k === 'forecast' || k === 'what_if') return /** @type {MathMethod} */ (k);
  if (k === 'correlation' || k === 'trend') return null; // discovery correlation stays a discovery card unless tool/method set
  return null;
}

/**
 * @param {unknown} raw
 * @returns {{ label: string, value: string, note: string }[]}
 */
function parseKpis(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 4)
    .map((k) => ({
      label: str(k?.label ?? k?.name, 40),
      value: str(k?.value ?? (finite(k?.n) ? String(k.n) : ''), 48),
      note: str(k?.note, 80),
    }))
    .filter((k) => k.label && k.value);
}

/**
 * Prefer explicit assumptions[]; else fold params_used into auditable bullets (mark defaulted).
 * @param {unknown} assumptions
 * @param {unknown} params
 * @returns {string[]}
 */
export function assumptionsFromPayload(assumptions, params) {
  const list = strList(assumptions, 12, 240);
  if (list.length) return list;
  if (!params || typeof params !== 'object') return [];
  const out = [];
  for (const [key, val] of Object.entries(params).slice(0, 10)) {
    if (key === 'defaulted' || key === 'defaults') continue;
    const label = key.replace(/_/g, ' ');
    const defaulted =
      (params.defaulted === true && (key === 'window' || key === 'window_days' || key === 'series')) ||
      (Array.isArray(params.defaults) && params.defaults.includes(key));
    const value = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val).slice(0, 80);
    if (!value) continue;
    out.push(defaulted ? `${label}: ${value} (defaulted)` : `${label}: ${value}`);
  }
  return out.slice(0, 12);
}

/**
 * Derive 2–4 KPI chips when Backend omitted kpis[] but sent figures / visual.
 * @param {MathMethod} method
 * @param {Array<{ label: string, value: string, n: number | null, note: string }>} figures
 * @param {Record<string, unknown> | null} visual
 * @param {Record<string, unknown> | null} metrics
 */
export function deriveKpis(method, figures, visual, metrics) {
  const fromFigures = (figures || []).slice(0, 4).map((f) => ({ label: f.label, value: f.value, note: f.note || '' }));
  if (fromFigures.length >= 2) return fromFigures.slice(0, 4);

  /** @type {{ label: string, value: string, note: string }[]} */
  const out = [];
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  if (method === 'regression') {
    if (finite(m.slope)) out.push({ label: 'Slope', value: String(Number(m.slope.toFixed ? m.slope.toFixed(4) : m.slope)), note: '' });
    if (finite(m.r2) || finite(m.r_squared)) {
      const r2 = finite(m.r2) ? m.r2 : m.r_squared;
      out.push({ label: 'R²', value: Number(r2).toFixed(3), note: '' });
    } else if (visual?.type === 'scatter' && finite(visual.r)) {
      out.push({ label: 'R²', value: (visual.r * visual.r).toFixed(3), note: 'from correlation' });
    }
    if (finite(m.n) || finite(m.sample_size)) out.push({ label: 'n', value: String(m.n ?? m.sample_size), note: 'sample size' });
    if (finite(m.p_value) || finite(m.pvalue)) out.push({ label: 'p-value', value: String(m.p_value ?? m.pvalue), note: '' });
  } else if (method === 'forecast') {
    if (finite(m.point) || finite(m.point_estimate)) {
      const point = m.point ?? m.point_estimate;
      const low = m.low ?? m.band_low;
      const high = m.high ?? m.band_high;
      out.push({
        label: str(m.horizon_label, 40) || 'Next period',
        value: finite(low) && finite(high) ? `${point} (${low}–${high})` : String(point),
        note: '80% band',
      });
    } else if (visual?.type === 'forecast' && Array.isArray(visual.forecast) && visual.forecast.length) {
      const i = 0;
      const point = visual.forecast[i];
      const low = visual.low?.[i];
      const high = visual.high?.[i];
      const label = Array.isArray(visual.x) ? str(visual.x[(visual.history?.length || 0) + i], 24) || 'Next period' : 'Next period';
      out.push({
        label,
        value: finite(low) && finite(high) ? `${point} (${low}–${high})` : String(point),
        note: '80% band',
      });
    }
  } else if (method === 'what_if') {
    if (finite(m.baseline) && finite(m.shocked)) {
      const d = m.shocked - m.baseline;
      const pct = m.baseline !== 0 ? (d / m.baseline) * 100 : null;
      out.push({ label: 'Baseline', value: String(m.baseline), note: '' });
      out.push({ label: 'Shocked', value: String(m.shocked), note: '' });
      out.push({ label: 'Δ', value: String(Number(d.toFixed(4))), note: '' });
      if (pct !== null) out.push({ label: 'Δ%', value: `${pct.toFixed(1)}%`, note: '' });
    }
  }
  return out.slice(0, 4);
}

/**
 * Parse the optional math block on a finding. Returns null when this finding is not math chrome.
 * Accepts top-level fields or nested `math` / `compute` / `stats` objects (Backend flexibility).
 * @param {Record<string, unknown>} raw
 */
export function parseMathBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const nest =
    (raw.math && typeof raw.math === 'object' ? raw.math : null) ||
    (raw.compute && typeof raw.compute === 'object' ? raw.compute : null) ||
    (raw.stats && typeof raw.stats === 'object' ? raw.stats : null) ||
    {};
  const tool = str(raw.tool ?? nest.tool ?? nest.tool_name, 40);
  const method = resolveMathMethod(tool, raw.method ?? nest.method, raw.kind);
  if (!method) return null;

  const statusRaw = str(raw.math_status ?? nest.status ?? nest.math_status, 16).toLowerCase();
  /** @type {MathStepState} */
  let mathStatus = 'done';
  if (statusRaw === 'failed' || statusRaw === 'error') mathStatus = 'failed';
  else if (statusRaw === 'unwired' || statusRaw === 'pending_backend' || statusRaw === 'not_wired') mathStatus = 'unwired';
  else if (statusRaw === 'running' || statusRaw === 'in_progress') mathStatus = 'running';

  // What-if with no numbers and no explicit done → honest unwired placeholder (do not invent).
  const kpisExplicit = parseKpis(raw.kpis ?? nest.kpis);
  const metrics = (raw.metrics && typeof raw.metrics === 'object' ? raw.metrics : null) || (nest.metrics && typeof nest.metrics === 'object' ? nest.metrics : null);
  if (method === 'what_if' && mathStatus === 'done' && !kpisExplicit.length && !metrics) {
    mathStatus = 'unwired';
  }

  const figures = Array.isArray(raw.figures)
    ? raw.figures
        .slice(0, 14)
        .map((f) => ({ label: str(f?.label, 60), value: str(f?.value, 40), n: Number.isInteger(f?.n) ? f.n : null, note: str(f?.note, 80) }))
        .filter((f) => f.label && f.value)
    : [];
  const visual = raw.visual && typeof raw.visual === 'object' ? raw.visual : null;
  const kpis = kpisExplicit.length ? kpisExplicit : deriveKpis(method, figures, visual, metrics);

  const assumptions = assumptionsFromPayload(raw.assumptions ?? nest.assumptions, raw.params_used ?? nest.params_used ?? nest.params);
  const caveat =
    str(raw.caveat ?? nest.caveat ?? nest.disclaimer ?? raw.disclaimer, 280) || DEFAULT_CAVEAT[method];
  const chartRef = str(raw.chart_ref ?? nest.chart_ref ?? raw.chartRef, 64) || null;
  const chartCaption = str(raw.chart_caption ?? nest.chart_caption ?? nest.caption, 160);
  const target = str(raw.target ?? nest.target ?? nest.series_label, 80);

  return {
    method,
    methodLabel: METHOD_LABEL[method],
    tool: tool || null,
    kpis,
    assumptions,
    caveat,
    chartRef,
    chartCaption,
    mathStatus,
    target,
    /** Stable structured bag for Phase 3 briefing — do not build briefing UI now. */
    structured: {
      method,
      kpis,
      assumptions,
      chartRef,
      caveat,
      sources: [],
    },
  };
}

/**
 * @param {import('./findings.mjs').Finding} f
 */
export function isMathFinding(f) {
  return Boolean(f?.math?.method);
}

/**
 * Provenance chip text: extend “From tools · 0 tokens” pattern for math steps.
 * @param {{ methodLabel?: string, tool?: string | null }} math
 */
export function mathProvenanceLine(math) {
  if (!math?.methodLabel) return '';
  return `From tools · ${math.methodLabel}`;
}

/**
 * Display title: “Regression — revenue vs. spend” when target known.
 * @param {{ methodLabel: string, target?: string }} math
 * @param {string} title
 */
export function mathCardTitle(math, title) {
  if (!math) return title;
  if (title && new RegExp(`^${math.methodLabel}\\b`, 'i').test(title)) return title;
  if (math.target) return `${math.methodLabel} — ${math.target}`;
  return title || math.methodLabel;
}

/**
 * Plain-text copy summary for one math finding (chart omitted).
 * @param {import('./findings.mjs').Finding} f
 * @param {{ sourceTitles?: string[] }} [opts]
 */
export function copyMathFindingSummary(f, opts = {}) {
  if (!f?.math) return '';
  const lines = [];
  lines.push(mathCardTitle(f.math, f.title));
  if (f.math.mathStatus === 'unwired') {
    lines.push('What-if / stress step is not wired yet — no scenario numbers.');
  } else if (f.math.mathStatus === 'failed') {
    lines.push(`Couldn’t complete ${f.math.methodLabel}.`);
  } else {
    for (const k of f.math.kpis) {
      lines.push(`${k.label}: ${k.value}${k.note ? ` (${k.note})` : ''}`);
    }
  }
  if (f.math.assumptions.length) {
    lines.push('Assumptions');
    for (const a of f.math.assumptions) lines.push(`- ${a}`);
  }
  if (f.math.caveat) lines.push(f.math.caveat);
  lines.push('Chart in case link');
  const sources = opts.sourceTitles?.length
    ? opts.sourceTitles
    : f.source?.table
      ? [f.source.origin === 'online' && f.provenance?.host ? f.provenance.host : f.source.table]
      : [];
  if (sources.length) {
    lines.push('Sources');
    for (const s of sources) lines.push(`- ${s}`);
  }
  return lines.join('\n');
}

/**
 * @param {import('./findings.mjs').ParsedFindings | null | undefined} data
 */
export function copyAllMathSummaries(data) {
  if (!data?.findings?.length) return '';
  const math = data.findings.filter(isMathFinding);
  if (!math.length) return '';
  const titles = (data.scope?.sources || []).map((s) => s.title || s.host || s.table).filter(Boolean);
  return math.map((f) => copyMathFindingSummary(f, { sourceTitles: titles })).join('\n\n');
}

/**
 * Build the in-run math step rail from payload.math_steps or from completed math findings.
 * @param {unknown} payloadSteps
 * @param {import('./findings.mjs').Finding[]} findings
 * @returns {Array<{ id: string, method: MathMethod, label: string, state: MathStepState, detail: string, findingId: string }>}
 */
export function buildMathSteps(payloadSteps, findings = []) {
  /** @type {Array<{ id: string, method: MathMethod, label: string, state: MathStepState, detail: string, findingId: string }>} */
  const fromPayload = [];
  if (Array.isArray(payloadSteps)) {
    for (const s of payloadSteps.slice(0, 8)) {
      const method = resolveMathMethod(s?.tool, s?.method, s?.kind);
      if (!method) continue;
      const stateRaw = str(s?.state ?? s?.status, 16).toLowerCase();
      /** @type {MathStepState} */
      let state = 'pending';
      if (stateRaw === 'done' || stateRaw === 'completed' || stateRaw === 'ok') state = 'done';
      else if (stateRaw === 'running' || stateRaw === 'in_progress') state = 'running';
      else if (stateRaw === 'failed' || stateRaw === 'error') state = 'failed';
      else if (stateRaw === 'unwired' || stateRaw === 'not_wired') state = 'unwired';
      else if (stateRaw === 'pending' || stateRaw === 'waiting') state = 'pending';
      else state = 'done';
      const id = str(s?.id, 24) || `math-${method}-${fromPayload.length + 1}`;
      fromPayload.push({
        id,
        method,
        label: str(s?.label, 40) || METHOD_LABEL[method],
        state: state === 'pending' ? 'running' : state, // rail shows Running / Done / Failed (+ unwired as Failed-ish)
        detail: str(s?.detail, 120),
        findingId: str(s?.finding_id ?? s?.findingId, 24) || id,
      });
    }
  }
  if (fromPayload.length) return fromPayload;

  return findings
    .filter(isMathFinding)
    .map((f, i) => ({
      id: f.id || `math-${i + 1}`,
      method: f.math.method,
      label: f.math.methodLabel,
      state: f.math.mathStatus === 'unwired' ? 'unwired' : f.math.mathStatus === 'failed' ? 'failed' : f.math.mathStatus === 'running' ? 'running' : 'done',
      detail: f.math.mathStatus === 'unwired' ? 'Not wired yet' : '',
      findingId: f.id,
    }));
}

/** Status label for the rail (Design: Running / Done / Failed). */
export function mathStepStatusLabel(state) {
  if (state === 'done') return 'Done';
  if (state === 'running') return 'Running';
  if (state === 'failed' || state === 'unwired') return 'Failed';
  return 'Running';
}

/**
 * Scan UI string sources for banned trading/quant theater copy.
 * @param {string} text
 * @returns {string[]} matching ban descriptions
 */
export function findBannedMathPhrases(text) {
  if (typeof text !== 'string' || !text) return [];
  const hits = [];
  for (const rx of MATH_BANNED) {
    if (rx.test(text)) hits.push(String(rx));
  }
  return hits;
}
