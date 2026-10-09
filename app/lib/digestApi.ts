import { getAuthHeaders } from './auth';
import { apiErrorFrom } from './customObjectsApi';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

export interface DigestSettings {
  enabled: boolean;
  email: boolean;
  slack: boolean;
  frequency_days: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  ai_access_allowed: boolean;
}

export interface DigestListItem {
  id: string;
  created_at: string | null;
  title: string;
  delivery: { email?: string; slack?: string };
}

export interface DigestDoc {
  id: string;
  project_id: string;
  project_name: string;
  question: string;
  text: string;
  findings: unknown;
  delivery: { email?: string; slack?: string };
  created_at: string | null;
}

const json = { 'Content-Type': 'application/json' };

export async function getDigestSettings(projectId: string): Promise<DigestSettings> {
  const res = await fetch(`${API_V1}/projects/${projectId}/digest`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load the weekly digest settings');
  return res.json();
}

export async function saveDigestSettings(projectId: string, body: { enabled: boolean; email: boolean; slack_webhook?: string | null }): Promise<DigestSettings> {
  const res = await fetch(`${API_V1}/projects/${projectId}/digest`, { method: 'PUT', headers: { ...json, ...getAuthHeaders() }, body: JSON.stringify(body) });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not save the weekly digest settings');
  return res.json();
}

export async function runDigestNow(projectId: string): Promise<{ status: string; digest?: { id: string } }> {
  const res = await fetch(`${API_V1}/projects/${projectId}/digest/run`, { method: 'POST', headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not make a digest');
  return res.json();
}

export async function listDigests(projectId: string): Promise<DigestListItem[]> {
  const res = await fetch(`${API_V1}/projects/${projectId}/digests`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load the digests');
  return (await res.json()).digests ?? [];
}

export async function getDigest(id: string): Promise<DigestDoc> {
  const res = await fetch(`${API_V1}/digests/${encodeURIComponent(id)}`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not open the digest');
  return res.json();
}
