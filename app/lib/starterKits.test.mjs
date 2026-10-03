import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { askHref, kitSummary, kitWidgets, mergeKitWidgets } from './starterKits.mjs';

const created = [{ api_name: 'deal', label: 'Deals' }, { api_name: 'contact', label: 'Contacts' }];

describe('starter kit widgets', () => {
  it('adds one live object table per created object', () => {
    const w = kitWidgets('p1', created);
    assert.equal(w.length, 2);
    assert.equal(w[0].binding.query_type, 'object_records');
    assert.equal(w[0].binding.params.object_api_name, 'deal');
    assert.equal(w[0].binding.params.project_id, 'p1');
    assert.equal(w[0].title, 'Deals records');
    assert.notEqual(w[0].id, w[1].id);
  });

  it('does not duplicate a table that is already on the board', () => {
    const existing = kitWidgets('p1', [created[0]]);
    const { widgets, dropped } = mergeKitWidgets(existing, kitWidgets('p1', created));
    assert.equal(widgets.length, 2);
    assert.equal(dropped, 0);
  });

  it('respects the widget cap and reports what it dropped', () => {
    const existing = Array.from({ length: 29 }, (_, i) => ({ id: `w${i}`, type: 'text' }));
    const { widgets, dropped } = mergeKitWidgets(existing, kitWidgets('p1', created));
    assert.equal(widgets.length, 30);
    assert.equal(dropped, 1);
  });

  it('handles empty input', () => {
    assert.deepEqual(mergeKitWidgets(undefined, undefined), { widgets: [], dropped: 0 });
    assert.deepEqual(kitWidgets('p', undefined), []);
  });
});

describe('kit charts', () => {
  const chart = { type: 'bar_chart', component: 'bar_chart', title: 'MRR by plan ($)', binding: { query_type: 'object_aggregate', params: { object_api_name: 'subscription', group_by: 'plan', metric: 'sum', field: 'mrr' } } };

  it('adds charts first, stamped with an id and the project, then the tables', () => {
    const w = kitWidgets('p1', [{ api_name: 'subscription', label: 'Subscriptions' }], [chart]);
    assert.equal(w.length, 2);
    assert.equal(w[0].binding.query_type, 'object_aggregate');
    assert.equal(w[0].binding.params.project_id, 'p1');
    assert.equal(w[0].binding.params.group_by, 'plan');
    assert.ok(w[0].id);
    assert.equal(w[1].binding.query_type, 'object_records');
    assert.equal(chart.binding.params.project_id, undefined); // the server's template is not mutated
  });

  it('does not add a chart that is already on the board', () => {
    const first = kitWidgets('p1', [], [chart]);
    const { widgets } = mergeKitWidgets(first, kitWidgets('p1', [], [chart]));
    assert.equal(widgets.length, 1);
  });

  it('keeps two different charts on the same object', () => {
    const other = { ...chart, title: 'Subscriptions by status' };
    const { widgets } = mergeKitWidgets(kitWidgets('p1', [], [chart]), kitWidgets('p1', [], [other]));
    assert.equal(widgets.length, 2);
  });
});

describe('links and labels', () => {
  it('builds a research link scoped to the project', () => {
    assert.equal(askHref('p1', 'What is my MRR?'), '/research?q=What+is+my+MRR%3F&project=p1');
    assert.equal(askHref(undefined, 'x'), '/research?q=x');
  });
  it('summarizes the sample rows', () => {
    assert.equal(kitSummary({ objects: [{ sample_rows: 24, label: 'Deals' }, { sample_rows: 12, label: 'Contacts' }] }), '24 deals · 12 contacts');
  });
});
