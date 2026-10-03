import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFilters, canEditInline, duplicateValues, emptyFilterRow, loadHidden, operatorsForType, parseInlineValue,
  plural, pruneSelection, saveHidden, selectionState, toggleAll, toggleHidden, toggleId, visibleFields,
} from './recordsView.mjs';

const FIELDS = [
  { api_name: 'name', type: 'text', label: 'Name', required: true },
  { api_name: 'age', type: 'number', label: 'Age' },
  { api_name: 'active', type: 'boolean', label: 'Active' },
  { api_name: 'email', type: 'email', label: 'Email', unique: true },
  { api_name: 'tier', type: 'picklist', label: 'Tier' },
];

test('operators depend on field type', () => {
  assert.ok(operatorsForType('number').includes('gte'));
  assert.deepEqual(operatorsForType('boolean'), ['eq']);
  assert.equal(operatorsForType('text')[0], 'contains');
});

test('buildFilters coerces to the field type and drops incomplete rows', () => {
  const out = buildFilters([
    { field: 'age', operator: 'gte', value: '30' },
    { field: 'active', operator: 'eq', value: 'yes' },
    { field: 'name', operator: 'contains', value: '' },
    { field: 'ghost', operator: 'eq', value: 'x' },
    { field: 'age', operator: 'eq', value: 'abc' },
  ], FIELDS);
  assert.deepEqual(out, [
    { field: 'age', operator: 'gte', value: 30 },
    { field: 'active', operator: 'eq', value: true },
  ]);
});

test('buildFilters falls back to a valid operator and splits "in" lists', () => {
  const out = buildFilters([
    { field: 'active', operator: 'contains', value: 'false' },
    { field: 'tier', operator: 'in', value: 'gold, silver ,' },
  ], FIELDS);
  assert.deepEqual(out, [
    { field: 'active', operator: 'eq', value: false },
    { field: 'tier', operator: 'in', value: ['gold', 'silver'] },
  ]);
});

test('emptyFilterRow starts on the first field with its first operator', () => {
  assert.deepEqual(emptyFilterRow(FIELDS), { field: 'name', operator: 'contains', value: '' });
  assert.deepEqual(emptyFilterRow([]), { field: '', operator: 'eq', value: '' });
});

test('selection toggling is immutable and select-all flips', () => {
  const a = new Set(['r1']);
  const b = toggleId(a, 'r2');
  assert.deepEqual([...a], ['r1']);
  assert.deepEqual([...b].sort(), ['r1', 'r2']);
  assert.deepEqual([...toggleId(b, 'r1')], ['r2']);
  assert.equal(toggleAll(new Set(), ['r1', 'r2']).size, 2);
  assert.equal(toggleAll(new Set(['r1', 'r2']), ['r1', 'r2']).size, 0);
  assert.equal(toggleAll(new Set(), []).size, 0);
});

test('pruneSelection drops ids no longer visible and keeps identity when unchanged', () => {
  const sel = new Set(['r1', 'r9']);
  assert.deepEqual([...pruneSelection(sel, ['r1', 'r2'])], ['r1']);
  const same = new Set(['r1']);
  assert.equal(pruneSelection(same, ['r1', 'r2']), same);
});

test('selectionState reports all / some / count', () => {
  assert.deepEqual(selectionState(new Set(['a']), ['a', 'b']), { count: 1, all: false, some: true });
  assert.deepEqual(selectionState(new Set(['a', 'b']), ['a', 'b']), { count: 2, all: true, some: false });
  assert.deepEqual(selectionState(new Set(), []), { count: 0, all: false, some: false });
});

test('columns can be hidden but never all of them', () => {
  let hidden = toggleHidden([], 'age', FIELDS);
  assert.deepEqual(hidden, ['age']);
  assert.equal(visibleFields(FIELDS, hidden).some((f) => f.api_name === 'age'), false);
  assert.deepEqual(toggleHidden(hidden, 'age', FIELDS), []);
  const two = [FIELDS[0], FIELDS[1]];
  hidden = toggleHidden([], 'name', two);
  hidden = toggleHidden(hidden, 'age', two);
  assert.deepEqual(hidden, ['name']);
});

test('hidden columns persist through storage and survive broken storage', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveHidden(storage, 'p1', 's1', ['age']);
  assert.deepEqual(loadHidden(storage, 'p1', 's1'), ['age']);
  assert.deepEqual(loadHidden(storage, 'p1', 'other'), []);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadHidden(broken, 'p1', 's1'), []);
  assert.doesNotThrow(() => saveHidden(broken, 'p1', 's1', ['x']));
  assert.deepEqual(loadHidden({ getItem: () => '{"not":"array"}' }, 'p', 's'), []);
  assert.deepEqual(loadHidden(undefined, 'p', 's'), []);
});

test('inline editing: which fields, and parsing what the user typed', () => {
  assert.equal(canEditInline(FIELDS[1]), true);
  assert.equal(canEditInline({ api_name: 'c', type: 'lookup' }), false);
  assert.equal(canEditInline(undefined), false);
  assert.deepEqual(parseInlineValue(FIELDS[1], '$1,200'), { ok: true, value: 1200 });
  assert.equal(parseInlineValue(FIELDS[1], 'abc').ok, false);
  assert.deepEqual(parseInlineValue(FIELDS[1], ''), { ok: true, value: null });
  assert.match(parseInlineValue(FIELDS[0], '').error, /required/);
  assert.deepEqual(parseInlineValue(FIELDS[2], true), { ok: true, value: true });
});

test('duplicateValues omits unique fields so the copy does not collide', () => {
  assert.deepEqual(
    duplicateValues(FIELDS, { name: 'A', email: 'a@x.io', age: 3 }),
    { name: 'A', age: 3 },
  );
});

test('plural', () => {
  assert.equal(plural(1, 'record'), '1 record');
  assert.equal(plural(3, 'record'), '3 records');
  assert.equal(plural(2, 'entity', 'entities'), '2 entities');
});
