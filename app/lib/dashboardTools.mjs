// Pure helpers for dashboard features: per-widget CSV export, global date filter, reorder, widget catalog.
// No React, no DOM: unit-tested with `node --test` (dashboardTools.test.mjs).

const DATE_KEYS = ['date', 'timestamp', 'time', 'datetime', 'day', 'period', 'x', 't', 'label'];

function pick(widget, key) {
  const fromProps = widget && widget.props ? widget.props[key] : undefined;
  return fromProps !== undefined ? fromProps : widget ? widget[key] : undefined;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ─── Tabular extraction + CSV ───────────────────────────────────────────────

/** Rows of objects -> {columns, rows}. Columns are the union of keys, first-seen order. */
function fromObjects(list) {
  const columns = [];
  for (const row of list) for (const k of Object.keys(row)) if (!columns.includes(k)) columns.push(k);
  return { columns, rows: list.map((row) => columns.map((c) => row[c])) };
}

/** What a widget would show as a table, or null when it has no tabular data. */
export function extractTable(widget) {
  if (!widget) return null;
  const columns = pick(widget, 'columns');
  const rows = pick(widget, 'rows');
  if (Array.isArray(columns) && Array.isArray(rows) && rows.length && Array.isArray(rows[0])) {
    return { columns: columns.map(String), rows };
  }
  if (Array.isArray(rows) && rows.length && isObj(rows[0])) return fromObjects(rows);

  const data = pick(widget, 'data');
  if (Array.isArray(data) && data.length && isObj(data[0])) return fromObjects(data);

  const series = pick(widget, 'series');
  if (Array.isArray(series) && series.length) {
    if (isObj(series[0]) && Array.isArray(series[0].data)) {
      // multi-series: [{name, data:[{x,y}]}]
      const out = [];
      for (const s of series) for (const p of s.data || []) out.push({ series: s.name ?? s.label ?? '', ...(isObj(p) ? p : { value: p }) });
      return out.length ? fromObjects(out) : null;
    }
    if (isObj(series[0])) return fromObjects(series);
  }
  return null;
}

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Spreadsheet formula injection: a cell that starts like a formula is neutralised with a quote.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function tableToCsv(columns, rows) {
  const lines = [columns.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  return lines.join('\r\n');
}

export function csvFilename(title, fallback = 'widget') {
  const base = String(title || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${base || fallback}.csv`;
}

// ─── Date range filter ──────────────────────────────────────────────────────

export const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'custom', label: 'Custom' },
];

const startOfDayUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Preset -> inclusive {from, to} (Dates or null). Custom values are YYYY-MM-DD strings. */
export function resolveDateRange(preset, now = new Date(), custom = {}) {
  const today = startOfDayUTC(now);
  const daysAgo = (n) => new Date(today.getTime() - n * 86400000);
  switch (preset) {
    case '7d': return { from: daysAgo(6), to: now };
    case '30d': return { from: daysAgo(29), to: now };
    case '90d': return { from: daysAgo(89), to: now };
    case 'ytd': return { from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), to: now };
    case 'custom': {
      const from = custom.from ? parseDate(custom.from) : null;
      const to = custom.to ? parseDate(custom.to) : null;
      return { from, to: to ? new Date(to.getTime() + 86400000 - 1) : null }; // inclusive end day
    }
    default: return { from: null, to: null };
  }
}

/** Accepts ISO-like strings and epoch milliseconds only; plain small numbers are NOT dates. */
export function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return value >= 1e11 ? new Date(value) : null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(rows) {
  const first = rows.find(isObj);
  if (!first) return null;
  return DATE_KEYS.find((k) => k in first && parseDate(first[k]) !== null) ?? null;
}

export function inRange(date, range) {
  if (!range || (!range.from && !range.to)) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function filterObjects(rows, range) {
  const key = dateKey(rows);
  if (!key) return rows; // no time axis: the filter does not apply, never hide data silently
  return rows.filter((r) => {
    const d = parseDate(r[key]);
    return d === null || inRange(d, range);
  });
}

function filterRowArrays(columns, rows, range) {
  const idx = columns.findIndex((c, i) => DATE_KEYS.includes(String(c).toLowerCase()) && rows.some((r) => parseDate(r[i]) !== null));
  if (idx < 0) return rows;
  return rows.filter((r) => {
    const d = parseDate(r[idx]);
    return d === null || inRange(d, range);
  });
}

/** Does the date filter have anything to act on in this widget? (Drives the "applies to N widgets" hint.) */
export function isDateFilterable(widget) {
  const probe = { from: new Date(0), to: new Date(0) };
  const filtered = applyDateRange(widget, probe);
  return filtered !== widget;
}

/** Copy of the widget with time-series rows limited to the range; the same object when nothing applies. */
export function applyDateRange(widget, range) {
  if (!widget || !range || (!range.from && !range.to)) return widget;
  let changed = false;
  const next = { ...widget };
  const props = widget.props ? { ...widget.props } : null;
  const targets = [next];
  if (props) targets.push(props);

  for (const t of targets) {
    for (const key of ['data', 'series']) {
      const v = t[key];
      if (!Array.isArray(v) || v.length === 0) continue;
      if (isObj(v[0]) && Array.isArray(v[0].data)) {
        const mapped = v.map((s) => ({ ...s, data: Array.isArray(s.data) ? filterObjects(s.data, range) : s.data }));
        t[key] = mapped;
        changed = true;
      } else if (isObj(v[0]) && dateKey(v)) {
        t[key] = filterObjects(v, range);
        changed = true;
      }
    }
    if (Array.isArray(t.rows) && t.rows.length) {
      if (Array.isArray(t.rows[0]) && Array.isArray(t.columns)) {
        const kept = filterRowArrays(t.columns, t.rows, range);
        if (kept !== t.rows) {
          t.rows = kept;
          changed = true;
        }
      } else if (isObj(t.rows[0]) && dateKey(t.rows)) {
        t.rows = filterObjects(t.rows, range);
        changed = true;
      }
    }
  }
  if (!changed) return widget;
  if (props) next.props = props;
  return next;
}

const FILTER_KEY = (projectId) => `analyzeit.dashfilter.${projectId || 'default'}`;

export function loadDateFilter(storage, projectId) {
  const fallback = { preset: 'all', from: '', to: '' };
  try {
    const parsed = JSON.parse(storage?.getItem(FILTER_KEY(projectId)) || 'null');
    if (!parsed || !DATE_PRESETS.some((p) => p.id === parsed.preset)) return fallback;
    return { preset: parsed.preset, from: String(parsed.from || ''), to: String(parsed.to || '') };
  } catch {
    return fallback;
  }
}

export function saveDateFilter(storage, projectId, filter) {
  try {
    storage?.setItem(FILTER_KEY(projectId), JSON.stringify(filter));
  } catch {
    // blocked storage: the choice just will not persist
  }
}

// ─── Reorder (drag and drop) ────────────────────────────────────────────────

/** Normalised move or null when it would do nothing / is out of range. */
export function moveIndex(from, to, length) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from < 0 || to < 0 || from >= length || to >= length || from === to) return null;
  return { from, to };
}

export function reorder(items, from, to) {
  const move = moveIndex(from, to, items.length);
  if (!move) return items;
  const next = [...items];
  const [moved] = next.splice(move.from, 1);
  next.splice(move.to, 0, moved);
  return next;
}

// ─── Widget catalog (manual "Add widget") ───────────────────────────────────
// Only widgets whose content the user types themselves. Charts and tables need real data, so they come
// from a data source (see objectTableWidget) rather than invented samples: the renderer refuses sample data.

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

export const WIDGET_CATALOG = [
  {
    type: 'metric_card',
    label: 'Metric',
    description: 'A single headline number you enter',
    fields: [
      { key: 'label', label: 'Label', kind: 'text', required: true, placeholder: 'Monthly revenue' },
      { key: 'value', label: 'Value', kind: 'text', required: true, placeholder: '$48,200' },
      { key: 'delta', label: 'Change (optional)', kind: 'text', placeholder: '+4.2%' },
      { key: 'trend', label: 'Direction', kind: 'select', options: ['flat', 'up', 'down'], default: 'flat' },
    ],
    build: (id, v) => ({ id, type: 'metric_card', component: 'metric_card', title: clean(v.label), label: clean(v.label), value: clean(v.value), delta: clean(v.delta) || '', trend: v.trend || 'flat', span: 1 }),
  },
  {
    type: 'progress_ring',
    label: 'Progress ring',
    description: 'Progress toward a goal',
    fields: [
      { key: 'label', label: 'Goal', kind: 'text', required: true, placeholder: 'Q3 target' },
      { key: 'percent', label: 'Percent complete (0-100)', kind: 'number', required: true, min: 0, max: 100 },
      { key: 'sublabel', label: 'Detail (optional)', kind: 'text', placeholder: '$850K of $1.0M' },
    ],
    build: (id, v) => ({ id, type: 'progress_ring', component: 'progress_ring', title: clean(v.label), label: clean(v.label), percent: Number(v.percent), sublabel: clean(v.sublabel) || '', span: 1 }),
  },
  {
    type: 'text_block',
    label: 'Note',
    description: 'Commentary or a summary',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text', required: true, placeholder: 'Key takeaway' },
      { key: 'body', label: 'Text', kind: 'textarea', required: true },
      { key: 'variant', label: 'Style', kind: 'select', options: ['insight', 'summary', 'warning'], default: 'insight' },
    ],
    build: (id, v) => ({ id, type: 'text_block', component: 'text_block', title: clean(v.heading), heading: clean(v.heading), body: clean(v.body), variant: v.variant || 'insight', span: 1 }),
  },
  {
    type: 'alert_banner',
    label: 'Alert banner',
    description: 'Call out something important',
    fields: [
      { key: 'message', label: 'Message', kind: 'textarea', required: true },
      { key: 'severity', label: 'Severity', kind: 'select', options: ['info', 'warning', 'error', 'success'], default: 'warning' },
    ],
    build: (id, v) => ({ id, type: 'alert_banner', component: 'alert_banner', title: 'Alert', message: clean(v.message), severity: v.severity || 'warning', span: 2 }),
  },
];

/** Defaults for a catalog entry's form (select fields start on their default). */
export function formDefaults(entry) {
  const out = {};
  for (const f of entry.fields) out[f.key] = f.default ?? '';
  return out;
}

/** {key: message} for every invalid field; empty object means the form can be submitted. */
export function validateWidgetForm(entry, values) {
  const errors = {};
  for (const f of entry.fields) {
    const raw = values[f.key];
    const text = typeof raw === 'string' ? raw.trim() : raw;
    if (f.required && (text === '' || text === undefined || text === null)) {
      errors[f.key] = `${f.label.replace(/ \(.*\)$/, '')} is required`;
      continue;
    }
    if (f.kind === 'number' && text !== '' && text !== undefined) {
      const n = Number(text);
      if (!Number.isFinite(n)) errors[f.key] = `${f.label.replace(/ \(.*\)$/, '')} must be a number`;
      else if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) errors[f.key] = `Must be between ${f.min} and ${f.max}`;
    }
  }
  return errors;
}

/** A table widget fed live from a custom object (refreshed via the object_records binding). */
export function objectTableWidget(id, projectId, objectApiName, label) {
  return {
    id,
    type: 'table',
    component: 'table',
    title: `${label || objectApiName} records`,
    columns: [],
    rows: [],
    span: 2,
    binding_type: 'object_bound',
    refresh_policy: { mode: 'on_open' },
    binding: { query_type: 'object_records', params: { object_api_name: objectApiName, project_id: projectId, limit: 50 } },
  };
}

export function newWidgetId(prefix = 'w') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
