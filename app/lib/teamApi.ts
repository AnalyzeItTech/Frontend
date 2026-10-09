import { getAuthHeaders } from './auth';
import { apiErrorFrom } from './customObjectsApi';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;
const json = { 'Content-Type': 'application/json' };

export interface Member {
  id: string;
  email: string;
  role: string;
  status: 'invited' | 'active';
  created_at: string | null;
  link?: string;
}

export async function listMembers(projectId: string): Promise<{ members: Member[]; max: number }> {
  const res = await fetch(`${API_V1}/projects/${projectId}/members`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load the team');
  return res.json();
}

export async function inviteMember(projectId: string, email: string): Promise<{ member: Member; link: string }> {
  const res = await fetch(`${API_V1}/projects/${projectId}/members`, { method: 'POST', headers: { ...json, ...getAuthHeaders() }, body: JSON.stringify({ email }) });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not send the invitation');
  return res.json();
}

export async function removeMember(projectId: string, memberId: string): Promise<void> {
  const res = await fetch(`${API_V1}/projects/${projectId}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not remove them');
}

export async function readInvite(token: string): Promise<{ project_name: string; email_hint: string; role: string }> {
  const res = await fetch(`${API_V1}/invites/${encodeURIComponent(token)}`);
  if (!res.ok) throw await apiErrorFrom(res, 'This invitation is not valid any more.');
  return res.json();
}

export async function acceptInvite(token: string): Promise<{ project_id: string }> {
  const res = await fetch(`${API_V1}/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not accept the invitation');
  return res.json();
}

export async function sharedProjects(): Promise<Array<{ id: string; name: string; role: string }>> {
  const res = await fetch(`${API_V1}/shared-projects`, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load shared projects');
  return (await res.json()).projects ?? [];
}
