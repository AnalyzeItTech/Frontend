import test from 'node:test';
import assert from 'node:assert/strict';
import { describeChange, explainApplyError, formatValue } from './dataChange.mjs';

test('update shows before/after and flags only the fields that actually change', () => {
  const d = describeChange({ action: 'update', api_name: 'contacts', record_id: 'r1', data: { age: 31, name: 'Ann' }, before: { age: 30, name: 'Ann' } });
  assert.equal(d.headline, 'Update contacts record r1');
  assert.deepEqual(d.rows.map((r) => [r.field, r.before, r.after, r.changed]), [['age', 30, 31, true], ['name', 'Ann', 'Ann', false]]);
  assert.equal(d.changedCount, 1);
  assert.ok(d.canApprove);
});

test('update with identical values warns that approving does nothing', () => {
  const d = describeChange({ action: 'update', api_name: 'c', record_id: 'r', data: { a: 1 }, before: { a: 1 } });
  assert.match(d.notes.join(' '), /already match/);
  assert.equal(d.changedCount, 0);
});

test('update without a preview says current values are unavailable but can still be approved', () => {
  const d = describeChange({ action: 'update', api_name: 'c', record_id: 'r', data: { a: 1 } });
  assert.match(d.notes[0], /could not be shown/);
  assert.equal(d.rows[0].before, undefined);
  assert.ok(d.canApprove);
});

test('create lists every new value', () => {
  const d = describeChange({ action: 'create', api_name: 'lead', data: { name: 'Zed', plan: 'pro' } });
  assert.equal(d.headline, 'Create a new lead record');
  assert.equal(d.rows.length, 2);
  assert.ok(d.rows.every((r) => r.changed && r.before === undefined));
});

test('delete says trash and recoverable, lists what is being removed', () => {
  const d = describeChange({ action: 'delete', api_name: 'lead', record_id: 'r9', before: { name: 'Zed' } });
  assert.match(d.headline, /to the trash/);
  assert.match(d.notes[0], /30 days/);
  assert.deepEqual(d.rows.map((r) => r.field), ['name']);
  assert.ok(d.canApprove);
  assert.ok(describeChange({ action: 'delete', api_name: 'lead', record_id: 'r9' }).canApprove);
});

test('anything else cannot be approved', () => {
  for (const p of [{ action: 'drop_table' }, {}, null, undefined, { action: 'create', data: {} }]) {
    assert.equal(describeChange(p).canApprove, false, JSON.stringify(p));
  }
});

test('formatValue is readable and bounded', () => {
  assert.equal(formatValue(null), '—');
  assert.equal(formatValue(''), '—');
  assert.equal(formatValue(true), 'Yes');
  assert.equal(formatValue(0), '0');
  assert.equal(formatValue({ a: 1 }), '{"a":1}');
  assert.equal(formatValue('x'.repeat(200)).length, 80);
});

test('apply errors are explained in plain language', () => {
  assert.match(explainApplyError(409), /fresh proposal/);
  assert.match(explainApplyError(401), /Sign in/);
  assert.match(explainApplyError(404), /no longer exists/);
  assert.equal(explainApplyError(400, 'Record is deleted'), 'Record is deleted');
  assert.equal(explainApplyError(500), 'The change could not be applied.');
});
