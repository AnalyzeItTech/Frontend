// Pure logic behind the objects table: selection, filters, column visibility, inline-edit parsing.
// Kept free of React so it can be unit-tested with `node --test` (see recordsView.test.mjs).

/** Operators offered per field type; they map 1:1 to what the backend accepts. */
export function operatorsForType(type) {
  switch (type) {
    case 'number':
    case 'currency':
    case 'date':
    case 'datetime':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];
    case 'boolean':
      return ['eq'];
    case 'picklist':
    case 'select':
      return ['eq', 'ne', 'in'];
    default:
      return ['contains', 'eq', 'ne'];
  }
}

export const OPERATOR_LABELS = {
  eq: 'is',
  ne: 'is not',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
  in: 'is one of',
};

function coerce(type, raw) {
  if (type === 'number' || type === 'currency') {
    const n = Number(String(raw).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  if (type === 'boolean') {
    const s = String(raw).trim().toLowerCase();
    if (['true', 'yes', '1'].includes(s)) return true;
    if (['false', 'no', '0'].includes(s)) return false;
    return undefined;
  }
  return String(raw);
}

/**
 * Turn the filter editor rows into API filters. Incomplete rows (no field, empty value) are dropped
 * rather than sent, and values are coerced to the field's type so "30" filters a number field as 30.
 * @param {{field:string, operator:string, value:any}[]} rows
 * @param {{api_name:string, type:string}[]} fields
 */
export function buildFilters(rows, fields) {
  const byName = new Map((fields || []).map((f) => [f.api_name, f]));
  const out = [];
  for (const row of rows || []) {
    const f = byName.get(row.field);
    if (!f) continue;
    const ops = operatorsForType(f.type);
    const operator = ops.includes(row.operator) ? row.operator : ops[0];
    if (row.value === '' || row.value === null || row.value === undefined) continue;
    if (operator === 'in') {
      const parts = String(row.value).split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length) out.push({ field: f.api_name, operator, value: parts });
      continue;
    }
    const value = coerce(f.type, row.value);
    if (value === undefined) continue;
    out.push({ field: f.api_name, operator, value });
  }
  return out;
}

export function emptyFilterRow(fields) {
  const first = (fields || [])[0];
  return { field: first ? first.api_name : '', operator: first ? operatorsForType(first.type)[0] : 'eq', value: '' };
}

// ─── Selection ──────────────────────────────────────────────────────────────

export function toggleId(selected, id) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Header checkbox: select everything visible, or clear if it is all already selected. */
export function toggleAll(selected, visibleIds) {
  const all = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  return all ? new Set() : new Set(visibleIds);
}

/** Drop selected ids that are no longer on screen (after a reload, filter or delete). */
export function pruneSelection(selected, visibleIds) {
  const visible = new Set(visibleIds);
  const next = new Set();
  for (const id of selected) if (visible.has(id)) next.add(id);
  return next.size === selected.size ? selected : next;
}

export function selectionState(selected, visibleIds) {
  const n = visibleIds.filter((id) => selected.has(id)).length;
  return { count: n, all: visibleIds.length > 0 && n === visibleIds.length, some: n > 0 && n < visibleIds.length };
}

// ─── Columns ────────────────────────────────────────────────────────────────

export function visibleFields(fields, hidden) {
  const h = new Set(hidden || []);
  return (fields || []).filter((f) => !h.has(f.api_name));
}

export function toggleHidden(hidden, apiName, fields) {
  const set = new Set(hidden || []);
  if (set.has(apiName)) {
    set.delete(apiName);
  } else {
    // Never hide the last visible column: an empty table is a dead end.
    const remaining = (fields || []).filter((f) => !set.has(f.api_name) && f.api_name !== apiName);
    if (remaining.length === 0) return [...set];
    set.add(apiName);
  }
  return [...set];
}

const key = (projectId, schemaId) => `analyzeit.cols.${projectId}.${schemaId}`;

export function loadHidden(storage, projectId, schemaId) {
  try {
    const raw = storage?.getItem(key(projectId, schemaId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHidden(storage, projectId, schemaId, hidden) {
  try {
    storage?.setItem(key(projectId, schemaId), JSON.stringify(hidden));
  } catch {
    // storage may be blocked (private mode); the preference just won't persist
  }
}

// ─── Inline edit ────────────────────────────────────────────────────────────

/** Field types that can be edited in place (relations and long text go through the detail dialog). */
export const INLINE_EDITABLE = new Set(['text', 'number', 'currency', 'email', 'url', 'date', 'picklist', 'select', 'boolean']);

export function canEditInline(field) {
  return Boolean(field) && INLINE_EDITABLE.has(field.type);
}

/**
 * Convert what the user typed into the value to PATCH. Returns { ok, value } or { ok:false, error }.
 * An empty entry clears the field (null) unless it is required.
 */
export function parseInlineValue(field, raw) {
  const empty = raw === '' || raw === null || raw === undefined;
  if (empty) {
    return field.required ? { ok: false, error: `${field.label || field.api_name} is required` } : { ok: true, value: null };
  }
  if (field.type === 'number' || field.type === 'currency') {
    const n = Number(String(raw).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: `${field.label || field.api_name} must be a number` };
  }
  if (field.type === 'boolean') return { ok: true, value: raw === true || raw === 'true' };
  return { ok: true, value: String(raw) };
}

/** Values for "Duplicate record": copy everything except unique fields (they would collide). */
export function duplicateValues(fields, values) {
  const out = {};
  for (const f of fields || []) {
    if (f.unique) continue;
    const v = (values || {})[f.api_name];
    if (v !== undefined) out[f.api_name] = v;
  }
  return out;
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}
