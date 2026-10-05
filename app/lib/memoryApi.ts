import { getAuthHeaders } from './auth';
import { parseApiFailure } from './apiErrors';

const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

export type MemorySource = {
  id: string;
  kind: string | null;
  /** The file or connector name, when the source has one. */
  title?: string | null;
  /** "Uploaded file", "Connected data", "Past conversation"… */
  kind_label?: string | null;
  project_id: string | null;
  tokens: number;
  tier_state: string | null;
  pinned: boolean;
  created_at: string | null;
};

async function fail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error(parseApiFailure(res.status, body).message || fallback);
}

export async function listMemorySources(q = ''): Promise<MemorySource[]> {
  const res = await fetch(`${API_V1}/retention/sources?q=${encodeURIComponent(q)}`, { headers: getAuthHeaders() });
  if (!res.ok) return fail(res, 'Could not load memory sources');
  return (await res.json()).sources as MemorySource[];
}

export async function pinMemorySource(id: string, pinned: boolean): Promise<void> {
  const res = await fetch(`${API_V1}/retention/sources/${encodeURIComponent(id)}/pin?pinned=${pinned}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) await fail(res, 'Could not update pin');
}

export async function deleteMemorySource(id: string): Promise<{ refunded_tokens: number }> {
  const res = await fetch(`${API_V1}/retention/sources/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) return fail(res, 'Could not delete source');
  return res.json();
}

export async function getMemoryWarnings(): Promise<{ stored: string | null; hot: string | null }> {
  const res = await fetch(`${API_V1}/retention/warnings`, { headers: getAuthHeaders() });
  if (!res.ok) return { stored: null, hot: null };
  return res.json();
}

export async function exportMemory(): Promise<void> {
  const res = await fetch(`${API_V1}/retention/export`, { headers: getAuthHeaders() });
  if (!res.ok) return fail(res, 'Export failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = 'memory-export.zip';
  a.click();
  URL.revokeObjectURL(url);
}
