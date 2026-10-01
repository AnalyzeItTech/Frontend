/**
 * Project home (/project/[id]): links, counts, and empty states.
 * Research run history is not invented — the client can fetch one run by id only.
 */
import { isValidPersonalSlug } from './personalHost.mjs';

export const RUN_HISTORY_GAP =
  'Research runs for this project are not listed. The API can fetch one run by id, and it does not offer a project run history, so this page does not show a run count.';

export function projectLinks(projectId) {
  const id = String(projectId || '').trim();
  if (!id) throw new Error('A project id is required');
  const encoded = encodeURIComponent(id);
  return {
    home: `/project/${encoded}`,
    research: `/research?project=${encoded}&mode=research`,
    dashboard: `/dashboard?project=${encoded}`,
    objects: `/objects?project=${encoded}`,
    connectors: `/connectors?project=${encoded}`,
  };
}

export function routeProjectId(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

/** Personal host hint. Invalid or reserved slugs stay text and do not become a host. */
export function subdomainHint(slug) {
  if (typeof slug !== 'string') return null;
  const clean = slug.trim();
  if (!clean) return null;
  if (!isValidPersonalSlug(clean)) return { slug: clean, host: null };
  return { slug: clean, host: `${clean}.analyzeit.in` };
}

export function formatProjectTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return String(value);
}

function asCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function widgetCountFromLayout(layout) {
  const widgets = layout?.layout_json?.widgets;
  if (!Array.isArray(widgets)) return null;
  return widgets.length;
}

/** Prefer the live layout. Fall back to the project summary only when the layout is missing. */
export function resolveWidgetCount(layout, summaryCount) {
  if (layout) {
    const fromLayout = widgetCountFromLayout(layout);
    if (fromLayout != null) return fromLayout;
  }
  return asCount(summaryCount);
}

export function buildProjectOverview({ project, counts }) {
  const widgets = asCount(counts?.widgets);
  const objects = asCount(counts?.objects);
  const datasets = asCount(counts?.datasets);
  const attachments = asCount(counts?.attachments);
  const connectors = asCount(counts?.connectors);
  const known = [widgets, objects, datasets, attachments, connectors];
  const present = known.filter((value) => value != null);
  const hasActivity = present.some((value) => value > 0);
  const allZero = present.length > 0 && present.every((value) => value === 0);
  const countsIncomplete = known.some((value) => value == null);

  let status;
  if (hasActivity) status = { id: 'started', label: 'Started' };
  else if (allZero && !countsIncomplete) status = { id: 'empty', label: 'Empty' };
  else if (countsIncomplete) status = { id: 'partial', label: 'Incomplete' };
  else status = { id: 'unknown', label: 'Unknown' };

  const id = typeof project?.id === 'string' ? project.id : '';
  const name = typeof project?.name === 'string' ? project.name.trim() : '';

  return {
    title: name || 'Untitled project',
    id,
    slug: subdomainHint(project?.dashboard_slug),
    status,
    createdAt: typeof project?.created_at === 'string' ? project.created_at : null,
    updatedAt: typeof project?.updated_at === 'string' ? project.updated_at : null,
    layoutVersion: typeof project?.layout_version === 'number' ? project.layout_version : null,
    counts: { widgets, objects, datasets, attachments, connectors },
    countsIncomplete,
    workspaceEmpty: status.id === 'empty',
    runs: { listed: false, gap: RUN_HISTORY_GAP },
    links: id ? projectLinks(id) : null,
  };
}

function listState(value) {
  if (!Array.isArray(value)) return { kind: 'unavailable', items: [] };
  return { kind: 'list', items: value };
}

export function listArtifacts({ datasets, attachments } = {}) {
  const datasetState = listState(datasets);
  const attachmentState = listState(attachments);
  const rows = [];

  if (datasetState.kind === 'list') {
    for (const item of datasetState.items) {
      const title =
        typeof item?.filename === 'string' && item.filename.trim()
          ? item.filename.trim()
          : 'Untitled dataset';
      rows.push({
        kind: 'dataset',
        id: String(item?.id || title),
        title,
        meta: typeof item?.row_count === 'number' ? `${item.row_count} rows` : null,
      });
    }
  }

  if (attachmentState.kind === 'list') {
    for (const item of attachmentState.items) {
      const title =
        typeof item?.filename === 'string' && item.filename.trim()
          ? item.filename.trim()
          : 'Untitled attachment';
      rows.push({
        kind: 'attachment',
        id: String(item?.attachment_id || title),
        title,
        meta: typeof item?.status === 'string' && item.status.trim() ? item.status.trim() : null,
      });
    }
  }

  const datasetsUnavailable = datasetState.kind !== 'list';
  const attachmentsUnavailable = attachmentState.kind !== 'list';
  const unavailable = datasetsUnavailable || attachmentsUnavailable;

  return {
    rows,
    empty: !unavailable && rows.length === 0,
    unavailable,
    datasetsUnavailable,
    attachmentsUnavailable,
  };
}

export function visibleArtifacts(rows, limit = 8) {
  const list = Array.isArray(rows) ? rows : [];
  const cap = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : list.length;
  return {
    visible: list.slice(0, cap),
    hidden: Math.max(0, list.length - cap),
  };
}

/**
 * Objects and connectors pages: honor ?project= and never substitute a different project.
 * status: 'content' | 'empty' | 'missing'
 */
export function pickScopedProject(projects, requestedId) {
  const list = Array.isArray(projects)
    ? projects.filter((project) => project && typeof project.id === 'string' && project.id)
    : [];
  const requested = typeof requestedId === 'string' ? requestedId.trim() : '';
  if (requested) {
    const match = list.find((project) => project.id === requested);
    if (!match) return { status: 'missing', projectId: '' };
    return { status: 'content', projectId: match.id };
  }
  if (!list.length) return { status: 'empty', projectId: '' };
  return { status: 'content', projectId: list[0].id };
}

/** Greeting by local hour. Takes a Date so tests stay deterministic. */
export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "3 hours ago" style label, or null for a missing or unparseable stamp. */
export function relativeTime(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) return 'just now';
  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2592000],
    ['year', 31536000],
  ];
  let label = 'just now';
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      label = `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return label;
}

/**
 * Starter questions built only from what the project really holds.
 * Falls back to general prompts so the composer is never empty.
 */
export function starterPrompts(artifactRows, counts) {
  const rows = Array.isArray(artifactRows) ? artifactRows : [];
  const prompts = [];
  const dataset = rows.find((row) => row.kind === 'dataset');
  const attachment = rows.find((row) => row.kind === 'attachment');
  if (dataset) {
    prompts.push(`Summarize ${dataset.title} and flag anything unusual`);
    prompts.push(`What are the three most interesting trends in ${dataset.title}?`);
  }
  if (attachment) prompts.push(`Pull the key points out of ${attachment.title}`);
  if (counts?.widgets > 0) prompts.push('What changed on my dashboard since I last looked?');
  if (counts?.connectors > 0) prompts.push('Give me a briefing from my connected sources');
  // Live-data asks first: weather, FX and quotes are the quickest real answer a new project can get.
  const general = [
    'What is the weather in Mumbai right now?',
    'Convert 100 USD to INR at today\'s rate',
    'How are AAPL and MSFT trading today?',
    'Research a topic and give me sources I can check',
  ];
  for (const prompt of general) {
    if (prompts.length >= 4) break;
    prompts.push(prompt);
  }
  return prompts.slice(0, 4);
}

/** Setup checklist derived from real counts. Unknown counts are neither done nor blocking. */
export function setupProgress(counts) {
  const steps = [
    { id: 'data', label: 'Add data', done: (counts?.datasets ?? 0) + (counts?.attachments ?? 0) > 0, known: counts?.datasets != null || counts?.attachments != null },
    { id: 'connect', label: 'Connect a source', done: (counts?.connectors ?? 0) > 0, known: counts?.connectors != null },
    { id: 'model', label: 'Define an object', done: (counts?.objects ?? 0) > 0, known: counts?.objects != null },
    { id: 'pin', label: 'Pin a widget', done: (counts?.widgets ?? 0) > 0, known: counts?.widgets != null },
  ];
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100) };
}

export function researchWithPrompt(projectId, prompt) {
  const base = projectLinks(projectId).research;
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  return text ? `${base}&q=${encodeURIComponent(text)}` : base;
}
