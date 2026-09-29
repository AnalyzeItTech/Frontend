/**
 * Project home routing and empty states.
 * Run: node --test app/lib/projectHome.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  RUN_HISTORY_GAP,
  buildProjectOverview,
  listArtifacts,
  pickScopedProject,
  projectLinks,
  resolveWidgetCount,
  routeProjectId,
  subdomainHint,
  visibleArtifacts,
} from './projectHome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const emptyCounts = {
  widgets: 0,
  objects: 0,
  datasets: 0,
  attachments: 0,
  connectors: 0,
};

describe('project home links', () => {
  it('keeps the project id on research, dashboard, objects, and connectors', () => {
    const id = 'proj 1/alpha?';
    const links = projectLinks(id);
    for (const href of [links.research, links.dashboard, links.objects, links.connectors]) {
      const url = new URL(href, 'https://www.analyzeit.in');
      assert.equal(url.searchParams.get('project'), id);
    }
    assert.equal(new URL(links.home, 'https://www.analyzeit.in').pathname, `/project/${encodeURIComponent(id)}`);
    assert.equal(new URL(links.research, 'https://www.analyzeit.in').searchParams.get('mode'), 'research');
  });

  it('reads the dynamic route param', () => {
    assert.equal(routeProjectId('abc'), 'abc');
    assert.equal(routeProjectId(['abc', 'ignored']), 'abc');
    assert.equal(routeProjectId('  '), '');
    assert.equal(routeProjectId(undefined), '');
  });
});

describe('project home empty states', () => {
  it('marks a project empty only when every known count is zero', () => {
    const overview = buildProjectOverview({
      project: {
        id: 'p1',
        name: 'Field notes',
        dashboard_slug: 'field-notes',
        created_at: '2026-01-02T00:00:00.000Z',
        layout_version: 1,
      },
      counts: emptyCounts,
    });
    assert.equal(overview.workspaceEmpty, true);
    assert.equal(overview.status.id, 'empty');
    assert.equal(overview.status.label, 'Empty');
    assert.equal(overview.runs.listed, false);
    assert.equal(overview.runs.gap, RUN_HISTORY_GAP);
    assert.equal(overview.slug.host, 'field-notes.analyzeit.in');
    assert.equal(overview.links.dashboard.includes('project=p1'), true);
  });

  it('does not call a failed count zero', () => {
    const overview = buildProjectOverview({
      project: { id: 'p2', name: 'Partial' },
      counts: { widgets: null, objects: null, datasets: null, attachments: null, connectors: null },
    });
    assert.equal(overview.workspaceEmpty, false);
    assert.equal(overview.status.id, 'partial');
    assert.equal(overview.countsIncomplete, true);
    assert.equal(overview.counts.widgets, null);
  });

  it('stays started when one real count is above zero and another list failed', () => {
    const overview = buildProjectOverview({
      project: { id: 'p3', name: '  ' },
      counts: { widgets: 2, objects: 0, datasets: null, attachments: 0, connectors: 0 },
    });
    assert.equal(overview.title, 'Untitled project');
    assert.equal(overview.status.id, 'started');
    assert.equal(overview.workspaceEmpty, false);
    assert.equal(overview.countsIncomplete, true);
  });

  it('treats an empty artifact payload as empty and a missing payload as unavailable', () => {
    const empty = listArtifacts({ datasets: [], attachments: [] });
    assert.equal(empty.empty, true);
    assert.equal(empty.rows.length, 0);
    assert.equal(empty.unavailable, false);

    const missing = listArtifacts({ datasets: null, attachments: [] });
    assert.equal(missing.empty, false);
    assert.equal(missing.datasetsUnavailable, true);
    assert.equal(missing.unavailable, true);

    const filled = listArtifacts({
      datasets: [{ id: 'd1', filename: 'sales.csv', row_count: 3 }],
      attachments: [{ attachment_id: 'a1', filename: 'notes.pdf', status: 'ready' }],
    });
    assert.equal(filled.empty, false);
    assert.deepEqual(
      filled.rows.map((row) => row.title),
      ['sales.csv', 'notes.pdf'],
    );
    const windowed = visibleArtifacts(filled.rows, 1);
    assert.equal(windowed.visible.length, 1);
    assert.equal(windowed.hidden, 1);
  });

  it('uses layout widgets, then the summary count, and never invents zero', () => {
    assert.equal(resolveWidgetCount({ layout_json: { widgets: [{}, {}] } }, 9), 2);
    assert.equal(resolveWidgetCount({ layout_json: { widgets: [] } }, 9), 0);
    assert.equal(resolveWidgetCount(null, 4), 4);
    assert.equal(resolveWidgetCount(null, undefined), null);
    assert.equal(resolveWidgetCount({ layout_json: {} }, undefined), null);
  });
});

describe('project scope on sibling pages', () => {
  it('uses the requested project and does not substitute another one', () => {
    const projects = [{ id: 'a' }, { id: 'b' }];
    assert.deepEqual(pickScopedProject(projects, 'b'), { status: 'content', projectId: 'b' });
    assert.deepEqual(pickScopedProject(projects, ''), { status: 'content', projectId: 'a' });
    assert.deepEqual(pickScopedProject(projects, 'missing'), { status: 'missing', projectId: '' });
    assert.deepEqual(pickScopedProject([], ''), { status: 'empty', projectId: '' });
  });

  it('hides a reserved slug instead of advertising it as a host', () => {
    assert.equal(subdomainHint(''), null);
    assert.equal(subdomainHint(null), null);
    assert.deepEqual(subdomainHint('www'), { slug: 'www', host: null });
    assert.equal(subdomainHint('lab').host, 'lab.analyzeit.in');
  });
});

describe('project home route wiring', () => {
  it('protects /project/[id] and renders it inside AppShell', () => {
    const page = read('app/project/[id]/page.tsx');
    const middleware = read('middleware.ts');
    assert.match(page, /<AppShell\s+active="project"/);
    assert.match(page, /buildProjectOverview/);
    assert.match(page, /getProjectById/);
    assert.match(page, /RUN_HISTORY_GAP|runs\.gap/);
    assert.doesNotMatch(page, /runs:\s*\[/);
    assert.match(middleware, /'\/project'/);
    assert.match(middleware, /'\/project\/:path\*'/);
  });

  it('threads the project id into research, objects, and connectors', () => {
    const research = read('app/research/page.tsx');
    const objects = read('app/objects/page.tsx');
    const connectors = read('app/connectors/page.tsx');
    const projects = read('app/Components/app/ProjectsManager.tsx');
    assert.match(research, /params\.get\('project'\)/);
    assert.match(research, /params\.get\('mode'\) === 'research'/);
    assert.match(objects, /pickScopedProject/);
    assert.match(connectors, /pickScopedProject/);
    assert.match(projects, /\/project\/\$\{encodeURIComponent\(project\.id\)\}/);
  });
});
