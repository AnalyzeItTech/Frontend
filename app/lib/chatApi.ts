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

export interface WidgetSpec {
  id: string;
  type: 'line_chart' | 'bar_chart' | 'metric_card' | 'table';
  title: string;
  metric?: string;
  value?: string;
  change?: string;
  positive?: boolean;
  data?: Array<Record<string, unknown>>;
  position?: { x: number; y: number; w: number; h: number };
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
  let finalText = '';
  const artifacts: Array<{ filename: string; type: string }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event: StreamEvent = JSON.parse(line);
      onEvent?.(event);

      if (event.event === 'run_id') {
        resolvedRunId = (event.payload.run_id as string) || resolvedRunId;
      }
      if (event.event === 'model_delta') {
        finalText += (event.payload.text as string) || '';
      }
      if (event.event === 'final') {
        finalText = (event.payload.text as string) || finalText;
        const arts = (event.payload.artifacts as Array<{ filename: string; type: string }>) || [];
        artifacts.push(...arts);
      }
    }
  }

  return { runId: resolvedRunId, finalText, artifacts };
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
