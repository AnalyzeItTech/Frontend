import { getAuthHeaders } from './auth';
import { apiErrorFrom } from './customObjectsApi';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

export interface StarterKit {
  id: string;
  name: string;
  description: string;
  try_asking: string[];
  objects: Array<{ api_name: string; label: string; fields: number; sample_rows: number }>;
}

export interface AppliedKit {
  kit_id: string;
  created: Array<{ api_name: string; object_id: string; label: string; rows: number }>;
  skipped: string[];
  /** Chart widgets bound live to object aggregates (only for objects this call created). */
  charts: Array<Record<string, unknown>>;
}

export async function listStarterKits(): Promise<StarterKit[]> {
  const res = await fetch(`${API_V1}/starter-kits`);
  if (!res.ok) throw await apiErrorFrom(res, 'Could not load starter kits');
  return (await res.json()).kits ?? [];
}

export async function applyStarterKit(projectId: string, kitId: string): Promise<AppliedKit> {
  const res = await fetch(`${API_V1}/projects/${encodeURIComponent(projectId)}/starter-kits/${encodeURIComponent(kitId)}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not apply this kit');
  return res.json();
}

export async function sampleDataCount(projectId: string): Promise<number> {
  const res = await fetch(`${API_V1}/projects/${encodeURIComponent(projectId)}/sample-data`, { headers: getAuthHeaders() });
  if (!res.ok) return 0;
  return Number((await res.json()).count) || 0;
}

export async function removeSampleData(projectId: string): Promise<number> {
  const res = await fetch(`${API_V1}/projects/${encodeURIComponent(projectId)}/sample-data`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Could not remove sample data');
  return Number((await res.json()).removed) || 0;
}
