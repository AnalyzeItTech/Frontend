// Pure helpers for starter kits: the dashboard widgets a kit adds, merging them into a layout, ask links.

import { newWidgetId, objectTableWidget } from './dashboardTools.mjs';

export const MAX_LAYOUT_WIDGETS = 30; // the Backend's hard cap per dashboard

/** One live table per object the kit created (skipped objects already existed and may already be on the board). */
export function kitWidgets(projectId, created) {
  return (created || []).map((o) => objectTableWidget(newWidgetId('kit'), projectId, o.api_name, o.label));
}

/** Append without exceeding the cap and without duplicating a table for the same object. */
export function mergeKitWidgets(existing, added, max = MAX_LAYOUT_WIDGETS) {
  const have = new Set(
    (existing || [])
      .filter((w) => w?.binding?.query_type === 'object_records')
      .map((w) => w.binding.params?.object_api_name),
  );
  const fresh = (added || []).filter((w) => !have.has(w.binding?.params?.object_api_name));
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
