export const RUN_HISTORY_GAP: string;

export function projectLinks(projectId: string): {
  home: string;
  research: string;
  dashboard: string;
  objects: string;
  connectors: string;
};

export function routeProjectId(raw: string | string[] | undefined | null): string;

export function subdomainHint(
  slug: string | null | undefined,
): { slug: string; host: string | null } | null;

export function formatProjectTimestamp(value: string | null | undefined): string | null;
export function formatCount(value: number | null | undefined): string;

export function widgetCountFromLayout(layout: {
  layout_json?: { widgets?: unknown[] };
} | null | undefined): number | null;

export function resolveWidgetCount(
  layout: { layout_json?: { widgets?: unknown[] } } | null | undefined,
  summaryCount: number | null | undefined,
): number | null;

export type ProjectHomeStatus = {
  id: 'started' | 'empty' | 'partial' | 'unknown';
  label: string;
};

export type ProjectHomeOverview = {
  title: string;
  id: string;
  slug: { slug: string; host: string | null } | null;
  status: ProjectHomeStatus;
  createdAt: string | null;
  updatedAt: string | null;
  layoutVersion: number | null;
  counts: {
    widgets: number | null;
    objects: number | null;
    datasets: number | null;
    attachments: number | null;
    connectors: number | null;
  };
  countsIncomplete: boolean;
  workspaceEmpty: boolean;
  runs: { listed: false; gap: string };
  links: {
    home: string;
    research: string;
    dashboard: string;
    objects: string;
    connectors: string;
  } | null;
};

export function buildProjectOverview(input: {
  project?: {
    id?: string;
    name?: string;
    dashboard_slug?: string | null;
    created_at?: string;
    updated_at?: string;
    layout_version?: number;
    widget_count?: number;
  } | null;
  counts?: {
    widgets?: number | null;
    objects?: number | null;
    datasets?: number | null;
    attachments?: number | null;
    connectors?: number | null;
  };
}): ProjectHomeOverview;

export type ArtifactRow = {
  kind: 'dataset' | 'attachment';
  id: string;
  title: string;
  meta: string | null;
};

export function listArtifacts(input?: {
  datasets?: unknown;
  attachments?: unknown;
}): {
  rows: ArtifactRow[];
  empty: boolean;
  unavailable: boolean;
  datasetsUnavailable: boolean;
  attachmentsUnavailable: boolean;
};

export function visibleArtifacts(
  rows: ArtifactRow[] | null | undefined,
  limit?: number,
): { visible: ArtifactRow[]; hidden: number };

export function pickScopedProject(
  projects: Array<{ id?: string } | null | undefined> | null | undefined,
  requestedId?: string | null,
): { status: 'content' | 'empty' | 'missing'; projectId: string };
