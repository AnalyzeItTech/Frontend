// Pure helpers for starter kits: the dashboard widgets a kit adds, merging them into a layout, ask links.

import { newWidgetId, objectTableWidget } from './dashboardTools.mjs';

export const MAX_LAYOUT_WIDGETS = 30; // the Backend's hard cap per dashboard

/**
 * What a kit puts on the board: its chart widgets (bound live to object aggregates) first, then one live table per
 * created object. Skipped objects already existed and may already be on the board.
 */
export function kitWidgets(projectId, created, charts) {
  const chartWidgets = (charts || []).map((c) => ({
    ...c,
    id: newWidgetId('kit'),
    binding: { ...c.binding, params: { ...c.binding.params, project_id: projectId } },
  }));
  const tables = (created || []).map((o) => objectTableWidget(newWidgetId('kit'), projectId, o.api_name, o.label));
  return [...chartWidgets, ...tables];
}

const sameWidget = (a, b) => {
  const qa = a?.binding?.query_type;
  if (qa !== b?.binding?.query_type) return false;
  if (qa === 'object_records') return a.binding.params?.object_api_name === b.binding.params?.object_api_name;
  if (qa === 'object_aggregate') return a.title === b.title && a.binding.params?.object_api_name === b.binding.params?.object_api_name;
  return false;
};

/** Append without exceeding the cap and without duplicating a table or chart that is already on the board. */
export function mergeKitWidgets(existing, added, max = MAX_LAYOUT_WIDGETS) {
  const fresh = (added || []).filter((w) => !(existing || []).some((e) => sameWidget(e, w)));
  const room = Math.max(0, max - (existing || []).length);
  return { widgets: [...(existing || []), ...fresh.slice(0, room)], dropped: Math.max(0, fresh.length - room) };
}

export function askHref(projectId, prompt) {
  const qs = new URLSearchParams({ q: prompt });
  if (projectId) qs.set('project', projectId);
  return `/research?${qs.toString()}`;
}

/** "24 deals · 12 contacts" */
export function kitSummary(kit) {
  return (kit.objects || []).map((o) => `${o.sample_rows} ${o.label.toLowerCase()}`).join(' · ');
}
