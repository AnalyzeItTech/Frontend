import { getAuthHeaders, getStoredUser } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface StreamEvent {
  v: number;
  run_id: string;
  seq: number;
  ts: string;
  event: string;
  payload: Record<string, unknown>;
}

export type WidgetType = 'metric_card' | 'line_chart' | 'bar_chart' | 'table' | 'sandboxed';

export interface BaseWidgetSpec {
  id: string;
  render_mode?: 'native' | 'sandboxed';
  component?: WidgetType | string;
  type?: WidgetType | string;
  title?: string;
  metric?: string;
  position?: { x: number; y: number; w: number; h: number };
  props?: Record<string, unknown>;
  code?: string;
  data?: Array<Record<string, unknown>> | Array<{ date?: string; label?: string; value?: number }>;
  value?: string | number;
  change?: string;
  positive?: boolean;
}

export interface MetricCardWidgetSpec extends BaseWidgetSpec {
  type?: 'metric_card';
  component?: 'metric_card';
  value?: string | number;
  change?: string;
  positive?: boolean;
}

export interface LineChartWidgetSpec extends BaseWidgetSpec {
  type?: 'line_chart';
  component?: 'line_chart';
  data?: Array<{ date?: string; value?: number }>;
}

export interface BarChartWidgetSpec extends BaseWidgetSpec {
  type?: 'bar_chart';
  component?: 'bar_chart';
  data?: Array<{ label?: string; date?: string; value?: number }>;
}

export interface TableWidgetSpec extends BaseWidgetSpec {
  type?: 'table';
  component?: 'table';
  data?: Array<Record<string, unknown>>;
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
  | SandboxedFrameWidgetSpec;

export type ProposalStatus = 'pending' | 'applying' | 'applied' | 'rejected' | 'error';

export interface ManagedProposal {
  actionId: string;
  projectId: string;
  action: string;
  widgetSpec: WidgetSpec;
  requiresConfirmation: boolean;
  status: ProposalStatus;
  createdAt: number;
  error?: string;
}

/**
 * Centralized data resolver for widgets.
 * Extracts data from props or top-level spec, and acts as the future hook for dynamic dataset slicing.
 */
export async function resolveWidgetData(
  widget: WidgetSpec,
  _projectId?: string
): Promise<Array<Record<string, unknown>>> {
  const candidate = widget.props?.data || widget.data;
  if (Array.isArray(candidate)) {
    return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

export interface ProjectLayoutData {
  project_id: string;
  version: number;
  layout_json: {
    widgets: WidgetSpec[];
  };
  updated_by: string;
  updated_at: string;
  last_action_id?: string | null;
}

export interface UIProposalPayload {
  project_id: string;
  action: string;
  action_id?: string;
  widget_spec: WidgetSpec;
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
  onEvent?: (event: StreamEvent) => void;
}

export async function streamChat(options: ChatOptions): Promise<{
  runId: string;
  projectId?: string;
  finalText: string;
  artifacts: Array<{ filename: string; type: string }>;
}> {
  const storedUser = getStoredUser();
  const effectiveUserId = options.userId || (storedUser ? storedUser.id : 'demo-user');
  const { message, userId = effectiveUserId, projectId, runId, projectTitle, incognito, onEvent } = options;

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message,
      user_id: userId,
      project_id: projectId,
      run_id: runId,
      project_title: projectTitle,
      incognito: incognito ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
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
    throw new Error(streamError);
  }

  return { runId: resolvedRunId, projectId: resolvedProjectId, finalText, artifacts };
}

export function getArtifactUrl(artifactId: string): string {
  return `${API_BASE}/artifacts/${artifactId}`;
}

export async function getRun(runId: string) {
  const response = await fetch(`${API_BASE}/runs/${runId}`);
  if (!response.ok) throw new Error(`Failed to fetch run: ${response.status}`);
  return response.json();
}

export async function getProjectLayout(projectId: string): Promise<ProjectLayoutData> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layout`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch project layout: ${res.status}`);
  return res.json();
}

export async function updateProjectLayout(
  projectId: string,
  expectedVersion: number,
  layoutJson: { widgets: WidgetSpec[] },
  updatedBy: 'user' | 'agent' = 'user'
): Promise<ProjectLayoutData> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/layout`, {
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
    throw new Error(`Failed to update layout: ${res.status}`);
  }
  return res.json();
}

export async function applyUIAction(
  projectId: string,
  actionId: string,
  applied: boolean
): Promise<{ action_id: string; status: string; applied: boolean; layout?: { widgets: WidgetSpec[] }; layout_version?: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/actions/${actionId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applied }),
  });
  if (!res.ok) throw new Error(`Failed to apply UI action: ${res.status}`);
  return res.json();
}

export async function getProjects(userId?: string): Promise<Array<{ id: string; name: string; layout_version: number; created_at: string }>> {
  const effectiveUserId = userId || getStoredUser()?.id || 'demo-user';
  const res = await fetch(`${API_BASE}/projects?user_id=${encodeURIComponent(effectiveUserId)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

export async function createProject(name: string, userId?: string): Promise<{ id: string; name: string; layout_version: number }> {
  const effectiveUserId = userId || getStoredUser()?.id || 'demo-user';
  const res = await fetch(`${API_BASE}/projects?user_id=${encodeURIComponent(effectiveUserId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create project: ${res.status}`);
  return res.json();
}
