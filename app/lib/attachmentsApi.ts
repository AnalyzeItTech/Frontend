import { getStoredToken } from './auth';
import { parseApiFailure } from './apiErrors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

/** Auth headers for multipart — omit Content-Type so the browser sets the boundary. */
function multipartAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const ATTACHMENT_ACCEPT_ATTR = [
  '.csv', '.tsv', '.txt', '.dsv', '.psv', '.tab',
  '.json', '.ndjson', '.jsonl',
  '.xlsx', '.xlsm',
  '.pdf',
  '.twb', '.twbx',
].join(',');

export interface ChatAttachment {
  attachment_id: string;
  filename: string;
  status: string;
  size_bytes: number;
  mime_type?: string;
  project_id?: string;
  run_id?: string | null;
  created_at?: string;
  extracted_summary?: string;
  notes?: string[];
  page_count?: number | null;
}

export async function uploadChatAttachment(
  projectId: string,
  file: File,
  runId?: string | null,
): Promise<ChatAttachment> {
  const body = new FormData();
  body.append('file', file);
  body.append('project_id', projectId);
  if (runId) body.append('run_id', runId);

  const res = await fetch(`${API_V1}/chat/attachments`, {
    method: 'POST',
    headers: multipartAuthHeaders(),
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const failure = parseApiFailure(res.status, err);
    throw new Error(failure.message || `Could not attach ${file.name}.`);
  }
  return res.json();
}

export async function deleteChatAttachment(attachmentId: string): Promise<void> {
  const res = await fetch(`${API_V1}/chat/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: multipartAuthHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const failure = parseApiFailure(res.status, err);
    throw new Error(failure.message || 'Could not remove attachment.');
  }
}

export async function listProjectAttachments(
  projectId: string,
  runId?: string | null,
): Promise<ChatAttachment[]> {
  const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : '';
  const res = await fetch(`${API_V1}/projects/${projectId}/attachments${qs}`, {
    headers: multipartAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const failure = parseApiFailure(res.status, err);
    throw new Error(failure.message || 'Could not list attachments.');
  }
  const data = await res.json();
  return Array.isArray(data?.attachments) ? data.attachments : [];
}
