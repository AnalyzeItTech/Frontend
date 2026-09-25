/**
 * Dashboard reading order and honest provenance.
 * A badge is shown only when a source or a time was actually recorded.
 */

const KIND_LABELS = {
  live_api: 'Live API',
  verified_db: 'Verified DB',
  synthetic_ai: 'Sample',
};

const SECONDARY_TYPES = new Set([
  'metric_card',
  'kpi',
  'kpi_sparkline',
  'progress_ring',
  'comparison_pair',
  'sparkline_list',
]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DASHBOARD_EMPTY = {
  title: 'Nothing saved from Research yet',
  body: 'This dashboard is where charts and notes from a research run wait for you. It stays empty until you keep something — it does not fill itself with sample metrics.',
  steps: [
    'Open Research and ask a question that needs live sources.',
    'Read the answer, then keep the charts or notes you want to come back to.',
    'They show up here. A source badge appears only when that run recorded a source or a time.',
  ],
  primaryLabel: 'Start Research',
  primaryHref: '/research',
  sampleLabel: 'Sample layouts',
  freeNote: 'Free includes 75 LLM runs a month.',
};

export const RESEARCH_STARTERS = [
  'Compare India and Vietnam manufacturing growth',
  'What changed in global semiconductor demand?',
  'Find climate risks for Mumbai',
];

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function researchStarterHref(prompt) {
  const q = clean(prompt);
  if (!q) return '/research';
  return `/research?q=${encodeURIComponent(q)}`;
}

/**
 * Format an ISO timestamp in UTC. Non-date labels (for example "as of 09:40")
 * are returned unchanged. Empty input is null — never a stand-in like "Live".
 */
export function formatProvenanceTime(value) {
  const raw = clean(value);
  if (!raw) return null;
  if (!/^\d{4}[-/]\d{2}[-/]\d{2}/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return raw;
  const d = new Date(parsed);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hh}:${mm} UTC`;
}

export function provenanceBadge(input = {}) {
  const provenance = input.provenance && typeof input.provenance === 'object' ? input.provenance : null;
  const binding = input.binding && typeof input.binding === 'object' ? input.binding : null;
  const kind = provenance && Object.prototype.hasOwnProperty.call(KIND_LABELS, provenance.kind)
    ? provenance.kind
    : null;
  const source = clean(provenance?.source) || null;
  const time =
    formatProvenanceTime(input.freshness) ||
    formatProvenanceTime(binding?.last_refreshed_at) ||
    formatProvenanceTime(provenance?.timestamp) ||
    null;

  // A kind string alone is not evidence. Hide the badge rather than invent Live / Preview / Sample.
  if (!source && !time) return null;

  return {
    kind,
    label: kind ? KIND_LABELS[kind] : null,
    source,
    time,
  };
}

export function provenanceBadgeText(badge) {
  if (!badge) return '';
  return [badge.label, badge.source, badge.time].filter(Boolean).join(' · ');
}

export function widgetRole(widget) {
  if (!widget || typeof widget !== 'object') return 'secondary';
  if (Number(widget.span) === 2) return 'primary';
  const type = String(widget.type || widget.component || widget.kind || '');
  if (SECONDARY_TYPES.has(type)) return 'secondary';
  return 'primary';
}

export function partitionDashboardWidgets(widgets) {
  const list = Array.isArray(widgets) ? widgets : [];
  const primary = [];
  const secondary = [];
  for (const widget of list) {
    if (widgetRole(widget) === 'primary') primary.push(widget);
    else secondary.push(widget);
  }
  return { primary, secondary };
}
