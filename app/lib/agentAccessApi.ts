import { getAuthHeaders } from './auth';
import { ApiError, apiErrorFrom } from './customObjectsApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export type AccessLevel = 'ask' | 'allow' | 'deny';

export interface AgentAccessObject {
  api_name: string;
  label: string;
  /** "manual" for objects you created; "connector:<provider>" for synced ones. */
  source: string;
  /** Explicit per-object choice, or null to follow the project default. */
  override: 'allow' | 'deny' | null;
  /** What actually applies right now. */
  access: AccessLevel;
}

export interface AgentAccess {
  project_id: string;
  default: AccessLevel;
  objects: AgentAccessObject[];
  connectors: Array<{ id: string; provider: string; status?: string }>;
  updated_at?: string | null;
}

export async function getAgentAccess(projectId: string): Promise<AgentAccess> {
  const res = await fetch(`${API_V1}/projects/${projectId}/agent-access`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load AI data access');
  return res.json();
}

export async function setAgentAccess(
  projectId: string,
  update: { default?: AccessLevel; overrides?: Record<string, 'allow' | 'deny' | null> },
): Promise<AgentAccess> {
  const res = await fetch(`${API_V1}/projects/${projectId}/agent-access`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not save AI data access');
  return res.json();
}

/** Approve or reject a data change the assistant proposed. Throws ApiError (status 409 = record changed since). */
export async function decideDataChange(projectId: string, actionId: string, approved: boolean) {
  const res = await fetch(`${API_V1}/projects/${projectId}/actions/${actionId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ applied: approved }),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'The change could not be applied');
  return res.json() as Promise<{ status: string; applied: boolean; record?: { recoverable?: boolean } }>;
}

export { ApiError };

export interface BulkApplyResult {
  changed: number;
  skipped: number;
  errors?: Array<{ id?: string; error: string }>;
  undo_until?: string;
}

/** Approve or reject a bulk change the assistant previewed. Approval applies the list of records the server kept. */
export async function decideBulkChange(projectId: string, actionId: string, approved: boolean) {
  const res = await fetch(`${API_V1}/projects/${projectId}/actions/${actionId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ applied: approved }),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'The change could not be applied');
  return res.json() as Promise<{ status: string; applied: boolean; bulk?: BulkApplyResult }>;
}

/** Undo an applied bulk change (open for 30 days). Records edited since are left alone. */
export async function undoBulkChange(projectId: string, actionId: string) {
  const res = await fetch(`${API_V1}/projects/${projectId}/actions/${actionId}/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) throw await apiErrorFrom(res, 'The change could not be undone');
  return res.json() as Promise<{ status: string; bulk: { restored: number; left_alone: number } }>;
}
