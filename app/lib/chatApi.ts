import { getAuthHeaders, getStoredUser } from './auth';
import { ChatRequestError, friendlyHttpMessage, parseApiFailure } from './apiErrors';

export { ChatRequestError };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export interface StreamEvent {
  v: number;
  run_id: string;
  seq: number;
  ts: string;
  event: string;
  payload: Record<string, unknown>;
}

export interface ProvenanceInfo {
  kind: 'live_api' | 'verified_db' | 'synthetic_ai';
  source: string;
  timestamp?: string;
}

export type WidgetType =
  | 'metric_card'
  | 'line_chart'
  | 'bar_chart'
  | 'table'
  | 'text_block'
  | 'progress_ring'
  | 'comparison_pair'
  | 'timeline'
  | 'sandboxed'
  | 'heatmap'
  | 'sparkline_list'
  | 'funnel'
  | 'distribution'
  | 'node_graph'
  | 'annotated_chart'
  | 'alert_banner'
  | 'composite_group'
  | 'donut_chart'
  | 'radar_chart'
  | 'choropleth_map'
  | 'transaction_list'
  | 'bubble_grid'
  | 'multi_series_chart'
  | 'kpi_sparkline';

export interface AnomalyRule {
  metric_path: string;
  condition: 'gt' | 'lt' | 'abs_gt';
  threshold: number;
  time_window_sec?: number;
}

export interface DataSourceBinding {
  query_type:
    | 'stock_quote'
    | 'weather_forecast'
    | 'timeseries_history'
    | 'telemetry_metric'
    | 'custom_api'
    | 'sql_query'
    | 'object_records';
  params: Record<string, unknown>;
  refresh_interval_sec?: number;
  last_refreshed_at?: string;
  next_refresh_at?: string;
  anomaly_rules?: AnomalyRule[];
}

export interface BaseWidgetSpec {
  id: string;
  kind?: WidgetType | string;
  render_mode?: 'native' | 'sandboxed';
  component?: WidgetType | string;
  type?: WidgetType | string;
  title?: string;
  label?: string;
  metric?: string;
  position?: { x: number; y: number; w: number; h: number };
  span?: 1 | 2;
  freshness?: string;
  provenance?: ProvenanceInfo;
  binding?: DataSourceBinding;
  consumesDimensions?: string[];
  emitsDimension?: string;
  props?: Record<string, unknown>;
  code?: string;
  data?: Array<Record<string, unknown>> | Array<{ date?: string; label?: string; value?: number }>;
  value?: string | number;
  change?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  unit?: string;
  timeframe?: string;
  positive?: boolean;
  visibility?: string[];
  redacted?: boolean;
}

export interface MetricCardWidgetSpec extends BaseWidgetSpec {
  type?: 'metric_card';
  component?: 'metric_card';
  label?: string;
  value?: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  change?: string;
  positive?: boolean;
}

export interface LineChartWidgetSpec extends BaseWidgetSpec {
  type?: 'line_chart';
  component?: 'line_chart';
  series?: Array<{ x: string; y: number }>;
  data?: Array<{ date?: string; value?: number }>;
  timeframe?: string;
  unit?: string;
}

export interface BarChartWidgetSpec extends BaseWidgetSpec {
  type?: 'bar_chart';
  component?: 'bar_chart';
  series?: Array<{ label: string; y: number }>;
  data?: Array<{ label?: string; date?: string; value?: number }>;
  unit?: string;
}

export interface TableWidgetSpec extends BaseWidgetSpec {
  type?: 'table';
  component?: 'table';
  columns?: string[];
  rows?: Array<Array<string | number>>;
  data?: Array<Record<string, unknown>>;
}

export interface TextBlockWidgetSpec extends BaseWidgetSpec {
  type?: 'text_block';
  component?: 'text_block';
  heading?: string;
  body?: string;
  variant?: 'insight' | 'warning' | 'summary';
}

export interface ProgressRingWidgetSpec extends BaseWidgetSpec {
  type?: 'progress_ring';
  component?: 'progress_ring';
  label?: string;
  percent?: number;
  sublabel?: string;
}

export interface ComparisonPairWidgetSpec extends BaseWidgetSpec {
  type?: 'comparison_pair';
  component?: 'comparison_pair';
  a?: { label: string; value: string; sub?: string };
  b?: { label: string; value: string; sub?: string };
  delta?: string;
}

export interface TimelineWidgetSpec extends BaseWidgetSpec {
  type?: 'timeline';
  component?: 'timeline';
  events?: Array<{ date: string; label: string; description?: string }>;
}

export interface HeatmapWidgetSpec extends BaseWidgetSpec {
  type?: 'heatmap';
  component?: 'heatmap';
  rows?: string[];
  cols?: string[];
  values?: number[][];
  colorScale?: 'warm' | 'cool' | 'emerald';
}

export interface SparklineListWidgetSpec extends BaseWidgetSpec {
  type?: 'sparkline_list';
  component?: 'sparkline_list';
  items?: Array<{
    label: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'flat';
    sparkline: number[];
  }>;
}

export interface FunnelWidgetSpec extends BaseWidgetSpec {
  type?: 'funnel';
  component?: 'funnel';
  stages?: Array<{
    label: string;
    value: number;
    sublabel?: string;
    rate?: string;
  }>;
}

export interface DistributionWidgetSpec extends BaseWidgetSpec {
  type?: 'distribution';
  component?: 'distribution';
  buckets?: Array<{
    range: string;
    count: number;
    percentage?: number;
  }>;
}

export interface NodeGraphWidgetSpec extends BaseWidgetSpec {
  type?: 'node_graph';
  component?: 'node_graph';
  nodes?: Array<{
    id: string;
    label: string;
    group?: string;
    val?: number;
  }>;
  edges?: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

export interface ChartAnnotation {
  x: string | number;
  label: string;
  type?: 'anomaly' | 'event' | 'milestone' | 'note';
  author?: 'agent' | 'user';
  authorName?: string;
  createdAt?: string;
}

export interface AnnotatedChartWidgetSpec extends BaseWidgetSpec {
  type?: 'annotated_chart';
  component?: 'annotated_chart';
  series?: Array<{ x: string; y: number }>;
  annotations?: ChartAnnotation[];
}

export interface AlertBannerWidgetSpec extends BaseWidgetSpec {
  type?: 'alert_banner';
  component?: 'alert_banner';
  severity?: 'info' | 'warning' | 'error' | 'success';
  message?: string;
  dismissible?: boolean;
}

export interface CompositeGroupWidgetSpec extends BaseWidgetSpec {
  type?: 'composite_group';
  component?: 'composite_group';
  layout?: 'row' | 'grid';
  widgets?: WidgetSpec[];
}

export interface DonutChartWidgetSpec extends BaseWidgetSpec {
  type?: 'donut_chart';
  component?: 'donut_chart';
  slices?: Array<{ label: string; value: number; color?: string }>;
  centerLabel?: string;
  unit?: string;
}

export interface RadarChartWidgetSpec extends BaseWidgetSpec {
  type?: 'radar_chart';
  component?: 'radar_chart';
  axes?: string[];
  series?: Array<{ name: string; values: number[]; color?: string }>;
  max?: number;
}

export interface ChoroplethMapWidgetSpec extends BaseWidgetSpec {
  type?: 'choropleth_map';
  component?: 'choropleth_map';
  regions?: Array<{ id: string; label: string; value: number }>;
  colorScale?: 'warm' | 'cool' | 'emerald';
}

export interface TransactionListWidgetSpec extends BaseWidgetSpec {
  type?: 'transaction_list';
  component?: 'transaction_list';
  rows?: Array<Record<string, string | number>>;
  limit?: number;
}

export interface BubbleGridWidgetSpec extends BaseWidgetSpec {
  type?: 'bubble_grid';
  component?: 'bubble_grid';
  points?: Array<{ x: number; y: number; r: number; label?: string; group?: string }>;
  xLabel?: string;
  yLabel?: string;
}

export interface MultiSeriesChartWidgetSpec extends BaseWidgetSpec {
  type?: 'multi_series_chart';
  component?: 'multi_series_chart';
  series?: Array<{ name: string; data: Array<{ x: string; y: number }>; color?: string }>;
  unit?: string;
  timeframe?: string;
}

export interface KpiSparklineWidgetSpec extends BaseWidgetSpec {
  type?: 'kpi_sparkline';
  component?: 'kpi_sparkline';
  value?: string | number;
  change?: string;
  positive?: boolean;
  sparkline?: number[];
  unit?: string;
}

export interface SandboxedFrameWidgetSpec extends BaseWidgetSpec {
  type?: 'sandboxed';
  component?: 'sandboxed';
  code?: string;
  csp?: string[];
  data?: Array<Record<string, unknown>>;
}

export type WidgetSpec =
  | MetricCardWidgetSpec
  | LineChartWidgetSpec
  | BarChartWidgetSpec
  | TableWidgetSpec
  | TextBlockWidgetSpec
  | ProgressRingWidgetSpec
  | ComparisonPairWidgetSpec
  | TimelineWidgetSpec
  | HeatmapWidgetSpec
  | SparklineListWidgetSpec
  | FunnelWidgetSpec
  | DistributionWidgetSpec
  | NodeGraphWidgetSpec
  | AnnotatedChartWidgetSpec
  | AlertBannerWidgetSpec
  | CompositeGroupWidgetSpec
  | DonutChartWidgetSpec
  | RadarChartWidgetSpec
  | ChoroplethMapWidgetSpec
  | TransactionListWidgetSpec
  | BubbleGridWidgetSpec
  | MultiSeriesChartWidgetSpec
  | KpiSparklineWidgetSpec
  | SandboxedFrameWidgetSpec;

export type ProposalStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'error';

export interface ManagedProposal {
  actionId: string;
  projectId: string;
  action: string;
  widgetSpec?: WidgetSpec | null;
  widgets?: WidgetSpec[];
  requiresConfirmation: boolean;
  status: ProposalStatus;
  createdAt: number;
  skipped_widgets?: SkippedWidgetNotice[];
  error?: string;
  payload?: any;
}

/**
 * Resolve widget rows: prefer embedded data; if a live binding exists and projectId
 * is provided, refresh via Backend so object_records / sql_query stay current.
 */
export async function resolveWidgetData(
  widget: WidgetSpec,
  projectId?: string
): Promise<Array<Record<string, unknown>>> {
  const candidate = widget.props?.data || widget.data;
  if (Array.isArray(candidate) && candidate.length > 0) {
    return candidate as Array<Record<string, unknown>>;
  }

  const binding = widget.binding || (widget.props as any)?.binding;
  const queryType = binding?.query_type;
  if (
    projectId &&
    binding &&
    (queryType === 'sql_query' || queryType === 'object_records' || queryType === 'custom_api')
  ) {
    try {
      const res = await refreshWidgetData(projectId, widget.id);
      const updated = res.updated_widget;
      const refreshed =
        updated?.props?.data || updated?.data || (updated?.props as any)?.rows;
      if (Array.isArray(refreshed)) {
        if (refreshed.length && Array.isArray(refreshed[0])) {
          const cols = (updated?.props as any)?.columns || [];
          return (refreshed as unknown[][]).map((row) => {
            const obj: Record<string, unknown> = {};
            cols.forEach((c: string, i: number) => {
              obj[c] = row[i];
            });
            return obj;
          });
        }
        return refreshed as Array<Record<string, unknown>>;
      }
    } catch {
      // Fall through to empty — never invent rows
    }
  }
  return [];
}

export interface ProjectLayoutData {
  project_id: string;
  version: number;
  layout_json: {
    widgets: WidgetSpec[];
  };
  updated_at?: string;
  updated_by?: string;
  last_action_id?: string | null;
}

export interface SkippedWidgetNotice {
  id: string;
  title?: string;
  reason: string;
}

export interface UIProposalPayload {
  project_id: string;
  action: string;
  action_id?: string;
  widget_spec?: WidgetSpec | null;
  widgets?: WidgetSpec[];
  skipped_widgets?: SkippedWidgetNotice[];
  requires_confirmation: boolean;
  created_at?: number;
}

export interface ChatOptions {
  message: string;
  userId?: string;
  projectId?: string;
  runId?: string | null;
  projectTitle?: string;
  incognito?: boolean;
  layout?: { widgets: WidgetSpec[] };
  onEvent?: (event: StreamEvent) => void;
}

export async function streamChat(options: ChatOptions): Promise<{
  runId: string;
  projectId?: string;
  finalText: string;
  artifacts: Array<{ filename: string; type: string }>;
  sources: Array<{ url: string; title?: string; host?: string }>;
}> {
  const storedUser = getStoredUser();
  const effectiveUserId = options.userId || (storedUser ? storedUser.id : 'demo-user');
  const { message, userId = effectiveUserId, projectId, runId, projectTitle, incognito, layout, onEvent } = options;

  const response = await fetch(`${API_V1}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message,
      user_id: userId,
      project_id: projectId,
      run_id: runId,
      project_title: projectTitle,
      incognito: incognito ?? false,
      layout,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ChatRequestError(parseApiFailure(response.status, body));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let resolvedRunId = runId || '';
  let resolvedProjectId = projectId || '';
  let finalText = '';
  let streamError = '';
  const artifacts: Array<{ filename: string; type: string }> = [];
  const sources: Array<{ url: string; title?: string; host?: string }> = [];

  const parseTextPayload = (raw: unknown): string => {
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return raw
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object') {
            if ('text' in part && typeof (part as { text: unknown }).text === 'string') {
              return (part as { text: string }).text;
            }
          }
          return '';
        })
        .join('');
    }
    if (raw && typeof raw === 'object' && 'text' in raw && typeof (raw as { text: unknown }).text === 'string') {
      return (raw as { text: string }).text;
    }
    return '';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event: StreamEvent = JSON.parse(line);
        onEvent?.(event);

        if (event.event === 'run_id') {
          resolvedRunId = (event.payload.run_id as string) || resolvedRunId;
          resolvedProjectId = (event.payload.project_id as string) || resolvedProjectId;
        }
        if (event.event === 'model_delta') {
          finalText += parseTextPayload(event.payload.text);
        }
        if (event.event === 'final') {
          const parsed = parseTextPayload(event.payload.text);
          finalText = parsed || finalText;
          const arts = (event.payload.artifacts as Array<{ filename: string; type: string }>) || [];
          artifacts.push(...arts);
          const srcs = (event.payload.sources as Array<{ url: string; title?: string; host?: string }>) || [];
          sources.push(...srcs);
        }
        if (event.event === 'error') {
          const msg =
            (event.payload.message as string) ||
            (event.payload.error as string) ||
            (event.payload.detail as string) ||
            'Backend returned an error';
          streamError = msg;
        }
      } catch (parseErr) {
        console.warn('Failed to parse stream line:', line, parseErr);
      }
    }
  }

  if (!finalText && streamError) {
    const lower = streamError.toLowerCase();
    if (
      lower.includes('ngrok') ||
      lower.includes('/agent/run') ||
      lower.includes('relay_stream_error') ||
      (lower.includes('404') && lower.includes('agent'))
    ) {
      throw new Error(
        'The analysis agent is unreachable right now (Backend B). Try again shortly, or ask the team to point BACKEND_B_URL at a live Model deploy instead of a dead ngrok tunnel.',
      );
    }
    throw new Error(streamError);
  }

  return { runId: resolvedRunId, projectId: resolvedProjectId, finalText, artifacts, sources };
}

export function getArtifactUrl(artifactId: string): string {
  return `${API_V1}/artifacts/${artifactId}`;
}

export async function getRun(runId: string) {
  const response = await fetch(`${API_V1}/runs/${runId}`);
  if (!response.ok) throw new Error(`Failed to fetch run: ${response.status}`);
  return response.json();
}

export async function getProjectLayout(projectId: string): Promise<ProjectLayoutData> {
  const res = await fetch(`${API_V1}/projects/${projectId}/layout`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (res.status === 403) throw new Error('You are not authorized to view this project layout.');
    throw new Error(friendlyHttpMessage(res.status, 'Could not load this layout'));
  }
  return res.json();
}

export async function updateProjectLayout(
  projectId: string,
  expectedVersion: number,
  layoutJson: { widgets: WidgetSpec[] },
  updatedBy: 'user' | 'agent' = 'user'
): Promise<ProjectLayoutData> {
  const res = await fetch(`${API_V1}/projects/${projectId}/layout`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      expected_version: expectedVersion,
      layout_json: layoutJson,
      updated_by: updatedBy,
    }),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Conflict: Layout was modified concurrently. Please refresh.');
    }
    if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (res.status === 403) throw new Error('You are not authorized to update this project layout.');
    throw new Error(`Failed to update layout: ${res.status}`);
  }
  return res.json();
}

export async function applyUIAction(
  projectId: string,
  actionId: string,
  applied: boolean
): Promise<{ action_id: string; status: string; applied: boolean; layout?: { widgets: WidgetSpec[] }; layout_version?: number }> {
  const res = await fetch(`${API_V1}/projects/${projectId}/actions/${actionId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applied }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (res.status === 403) throw new Error('You are not authorized to change this project.');
    if (res.status === 409) throw new Error('Conflict: The project changed while applying this action.');
    throw new Error(`Failed to apply UI action: ${res.status}`);
  }
  return res.json();
}

export interface ProjectSummary {
  id: string;
  name: string;
  layout_version: number;
  widget_count?: number;
  created_at: string;
  updated_at?: string;
}

export async function getProjects(_userId?: string): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_V1}/projects`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(friendlyHttpMessage(res.status, 'Could not load projects'));
  return res.json();
}

export async function getProjectById(projectId: string): Promise<ProjectSummary> {
  const res = await fetch(`${API_V1}/projects/${projectId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(friendlyHttpMessage(res.status, 'Could not load this project'));
  return res.json();
}

export async function createProject(name: string, _userId?: string): Promise<ProjectSummary> {
  const res = await fetch(`${API_V1}/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(friendlyHttpMessage(res.status, 'Could not create the project'));
  return res.json();
}

export async function updateProject(projectId: string, name: string): Promise<ProjectSummary> {
  const res = await fetch(`${API_V1}/projects/${projectId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to update project: ${res.status}`);
  return res.json();
}

export async function deleteProject(projectId: string): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`${API_V1}/projects/${projectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`);
  return res.json();
}

// ─── Phase 2 & 3: Reality & Collaboration Extensions ──────────────────────────

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  widgets: WidgetSpec[];
  is_public: boolean;
  author_id?: string;
  created_at?: string;
}

export interface PresenceUser {
  user_id: string;
  user_name: string;
  focused_widget_id?: string | null;
  last_seen: number;
}

export async function refreshWidgetData(
  projectId: string,
  widgetId: string
): Promise<{ ok: boolean; updated_widget?: WidgetSpec; refreshed_at?: string; anomaly_proposal?: UIProposalPayload }> {
  const res = await fetch(`${API_V1}/projects/${projectId}/widgets/${widgetId}/refresh`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to refresh widget: ${res.status}`);
  return res.json();
}

export async function saveProjectTemplate(
  name: string,
  widgets: WidgetSpec[],
  description?: string,
  tags?: string[],
  isPublic = false
): Promise<ProjectTemplate> {
  const res = await fetch(`${API_V1}/templates`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, widgets, description, tags, is_public: isPublic }),
  });
  if (!res.ok) throw new Error(`Failed to save template: ${res.status}`);
  return res.json();
}

export async function getProjectTemplates(): Promise<ProjectTemplate[]> {
  try {
    const res = await fetch(`${API_V1}/templates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function sendPresenceHeartbeat(
  projectId: string,
  userId: string,
  userName: string,
  focusedWidgetId?: string | null
): Promise<PresenceUser[]> {
  try {
    const res = await fetch(`${API_V1}/projects/${projectId}/presence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, user_name: userName, focused_widget_id: focusedWidgetId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.active_users || [];
  } catch {
    return [];
  }
}

export async function removePresence(projectId: string, userId: string): Promise<void> {
  try {
    await fetch(`${API_V1}/projects/${projectId}/presence`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // best-effort cleanup
  }
}
