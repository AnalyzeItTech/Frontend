/**
 * Dashboard hierarchy and honest provenance badges.
 * Run: node --test app/lib/dashboardView.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  DASHBOARD_EMPTY,
  RESEARCH_STARTERS,
  formatProvenanceTime,
  partitionDashboardWidgets,
  provenanceBadge,
  provenanceBadgeText,
  researchStarterHref,
  widgetRole,
} from './dashboardView.mjs';

const root = path.resolve(import.meta.dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('provenance badges', () => {
  it('hides the badge when source and time are unknown', () => {
    assert.equal(provenanceBadge({}), null);
    assert.equal(provenanceBadge({ provenance: { kind: 'live_api', source: '  ' } }), null);
    assert.equal(provenanceBadge({ provenance: { kind: 'not_a_kind', source: '' } }), null);
    assert.equal(provenanceBadge({ binding: { query_type: 'sql_query' } }), null);
  });

  it('does not invent Preview, Live, or Synthesized AI', () => {
    const withSource = provenanceBadge({
      provenance: { kind: 'live_api', source: 'World Bank' },
    });
    assert.equal(withSource.label, 'Live API');
    assert.equal(withSource.source, 'World Bank');
    assert.equal(withSource.time, null);
    assert.equal(provenanceBadgeText(withSource).includes('Preview'), false);
    assert.equal(provenanceBadgeText(withSource).includes('Synthesized'), false);

    const timeOnly = provenanceBadge({ freshness: 'as of 09:40' });
    assert.equal(timeOnly.label, null);
    assert.equal(timeOnly.source, null);
    assert.equal(timeOnly.time, 'as of 09:40');
    assert.equal(provenanceBadgeText(timeOnly), 'as of 09:40');
  });

  it('shows sample provenance when a template recorded a source and time', () => {
    const badge = provenanceBadge({
      provenance: {
        kind: 'synthetic_ai',
        source: 'Curated template · sample data',
        timestamp: '2026-01-02T03:04:00.000Z',
      },
    });
    assert.equal(badge.label, 'Sample');
    assert.equal(badge.source, 'Curated template · sample data');
    assert.equal(badge.time, 'Jan 2, 03:04 UTC');
    assert.equal(formatProvenanceTime('not-a-clock'), 'not-a-clock');
  });

  it('keeps an unknown kind unlabeled when a source was recorded', () => {
    const badge = provenanceBadge({
      provenance: { kind: 'guessed', source: 'Reuters' },
    });
    assert.equal(badge.kind, null);
    assert.equal(badge.label, null);
    assert.equal(badge.source, 'Reuters');
  });
});

describe('widget hierarchy', () => {
  it('treats narrative and wide widgets as primary and compact metrics as supporting', () => {
    const widgets = [
      { id: 'm', type: 'metric_card' },
      { id: 't', type: 'text_block' },
      { id: 'c', type: 'bar_chart', span: 2 },
      { id: 'k', component: 'kpi_sparkline' },
    ];
    assert.equal(widgetRole(widgets[0]), 'secondary');
    assert.equal(widgetRole(widgets[1]), 'primary');
    assert.equal(widgetRole({ id: 'bar', type: 'bar_chart' }), 'primary');
    assert.equal(widgetRole(widgets[2]), 'primary');
    const { primary, secondary } = partitionDashboardWidgets(widgets);
    assert.deepEqual(primary.map((w) => w.id), ['t', 'c']);
    assert.deepEqual(secondary.map((w) => w.id), ['m', 'k']);
  });

  it('does not invent a primary row when every widget is a supporting metric', () => {
    const { primary, secondary } = partitionDashboardWidgets([
      { id: 'a', type: 'metric_card' },
      { id: 'b', type: 'kpi' },
    ]);
    assert.equal(primary.length, 0);
    assert.equal(secondary.length, 2);
  });
});

describe('research empty state', () => {
  it('points starters at Research with the question filled in', () => {
    assert.equal(DASHBOARD_EMPTY.primaryHref, '/research');
    assert.equal(researchStarterHref(''), '/research');
    assert.equal(
      researchStarterHref(RESEARCH_STARTERS[0]),
      `/research?q=${encodeURIComponent(RESEARCH_STARTERS[0])}`,
    );
    assert.match(DASHBOARD_EMPTY.freeNote, /75 LLM runs/);
    assert.equal(DASHBOARD_EMPTY.body.includes('₹'), false);
    assert.equal(DASHBOARD_EMPTY.body.toLowerCase().includes('free trial'), false);
  });

  it('dashboard page uses the research empty state and hides invented badge copy', () => {
    const page = read('app/dashboard/page.tsx');
    const renderer = read('app/Components/dashboard/WidgetRenderer.tsx');
    const newer = read('app/Components/dashboard/NewWidgets.tsx');
    assert.match(page, /DASHBOARD_EMPTY/);
    assert.match(page, /partitionDashboardWidgets/);
    assert.match(page, /data-widget-role="primary"/);
    assert.match(page, /data-widget-role="secondary"/);
    assert.equal(page.includes('A quiet canvas'), false);
    assert.equal(page.includes('Ask in Chat'), false);
    assert.equal(renderer.includes('Preview · not live'), false);
    assert.equal(renderer.includes("label: 'Synthesized AI'"), false);
    assert.equal(newer.includes("'Synthesized AI'"), false);
    assert.equal(newer.includes("kind === 'synthetic_ai' || !kind ? 'Preview'"), false);
  });
});
