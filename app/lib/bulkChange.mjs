// A change to many records that the assistant proposes: validate the preview the server worked out, and put it in plain words.
// The payload crosses a network boundary and holds the user's own data, so every string is plain text, bounded, and every number
// finite. The list of records it will touch never reaches the browser; approval applies the list the server kept (see `preview_id`).

import { formatValue } from './dataChange.mjs';

export const MAX_SAMPLE_ROWS = 8;
export const MAX_SAMPLE_FIELDS = 6;
export const MAX_SUMMARY_FIELDS = 8;
export const MAX_FROM_VALUES = 5;

// Control, zero-width, bidi and line-separator characters, built from code points so the source holds no invisible characters.
const CONTROL_RANGES = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2064], [0xfeff, 0xfeff]];
const CONTROL = new RegExp(`[${CONTROL_RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join('')}]`, 'g');

const finiteInt = (n) => (Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null);
const text = (v, max = 80) => (typeof v === 'string' ? v.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cell = (v) => (v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) ? v ?? null : null);

/** @returns {null | object} null when the payload is not a usable bulk preview */
export function parseBulkProposal(p) {
  if (!p || typeof p !== 'object' || p.type !== 'object_bulk_change') return null;
  const action = p.action === 'delete' ? 'delete' : p.action === 'update' ? 'update' : null;
  const matched = finiteInt(p.matched);
  const willChange = finiteInt(p.will_change);
  const previewId = text(p.preview_id, 64);
  if (!action || matched === null || willChange === null || willChange < 1 || willChange > matched || !previewId) return null;
  const where = (Array.isArray(p.where) ? p.where : []).map((w) => text(w, 160)).filter(Boolean).slice(0, 6);
  const set = p.set && typeof p.set === 'object' ? Object.entries(p.set).slice(0, MAX_SUMMARY_FIELDS).map(([field, value]) => ({ field: text(field, 60), value: cell(value) })).filter((s) => s.field) : [];
  if (action === 'update' && !set.length) return null;
  const summary = (Array.isArray(p.summary) ? p.summary : []).slice(0, MAX_SUMMARY_FIELDS).map((s) => ({
    field: text(s?.field, 60),
    after: cell(s?.after),
    from: (Array.isArray(s?.from) ? s.from : []).slice(0, MAX_FROM_VALUES).map((f) => ({ value: text(String(f?.value ?? ''), 80), count: finiteInt(f?.count) ?? 0 })),
  })).filter((s) => s.field);
  const sample = (Array.isArray(p.sample) ? p.sample : []).slice(0, MAX_SAMPLE_ROWS).map((r) => ({
    id: text(r?.id, 64),
    label: text(r?.label, 60),
    changes: (Array.isArray(r?.changes) ? r.changes : []).slice(0, MAX_SAMPLE_FIELDS).map((c) => ({ field: text(c?.field, 60), before: cell(c?.before), after: cell(c?.after) })).filter((c) => c.field),
  })).filter((r) => r.id);
  return {
    action,
    object: text(p.api_name, 80) || 'records',
    matched,
    willChange,
    unchanged: Math.max(0, matched - willChange),
    where,
    set,
    summary,
    sample,
    undoDays: finiteInt(p.undo_days) || 30,
    previewId,
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function bulkHeadline(b) {
  const what = plural(b.willChange, 'record');
  if (b.action === 'delete') return `Move ${what} in ${b.object} to the trash`;
  const sets = b.set.map((s) => `${s.field} to ${formatValue(s.value)}`).join(', ');
  return `Set ${sets} on ${what} in ${b.object}`;
}

/** One line per field: where the values are now and where they will end up, e.g. "status: open (10) → closed". */
export function bulkTransitions(b) {
  return b.summary.map((s) => {
    const from = s.from.map((f) => (f.value === '' || f.value === 'null' || f.value === 'None' ? `empty (${f.count})` : `${f.value} (${f.count})`)).join(', ');
    return { field: s.field, from: from || 'empty', to: formatValue(s.after) };
  });
}

export function bulkNotes(b) {
  const notes = [];
  if (b.unchanged > 0) notes.push(`${plural(b.unchanged, 'record')} that match already ${b.unchanged === 1 ? 'has' : 'have'} these values and will be left alone.`);
  if (b.willChange > b.sample.length) notes.push(`Showing ${b.sample.length} of ${b.willChange} records. Every record in the change follows the same rule.`);
  notes.push(b.action === 'delete' ? `Deleted records stay in the trash for ${b.undoDays} days.` : `You can undo this for ${b.undoDays} days. Records that someone edits after the preview are skipped, never overwritten.`);
  return notes;
}

/** What happened when the user approved. */
export function bulkResultLine(res) {
  const r = res && typeof res === 'object' ? res : {};
  const changed = finiteInt(r.changed) ?? 0;
  const skipped = finiteInt(r.skipped) ?? 0;
  const base = `Changed ${plural(changed, 'record')}.`;
  return skipped > 0 ? `${base} ${plural(skipped, 'record')} ${skipped === 1 ? 'was' : 'were'} skipped because ${skipped === 1 ? 'it was' : 'they were'} edited after the preview.` : base;
}

export function undoResultLine(res) {
  const r = res && typeof res === 'object' ? res : {};
  const restored = finiteInt(r.restored) ?? 0;
  const left = finiteInt(r.left_alone) ?? 0;
  const base = `Put back ${plural(restored, 'record')}.`;
  return left > 0 ? `${base} ${plural(left, 'record')} ${left === 1 ? 'was' : 'were'} left as is because ${left === 1 ? 'it was' : 'they were'} edited since.` : base;
}

export function explainBulkError(status, message) {
  if (status === 401) return 'Your session has expired. Sign in again to approve.';
  if (status === 403 || status === 404) return 'You are not allowed to change this project, or this change no longer exists.';
  if (typeof message === 'string' && /expired|already/i.test(message)) return `${message} Ask the assistant again for a fresh preview.`;
  return message || 'The change could not be applied.';
}
