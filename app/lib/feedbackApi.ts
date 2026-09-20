import { getAuthHeaders, getStoredToken } from './auth';
import { parseApiFailure } from './apiErrors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'billing' | 'other';
export type FeedbackStatus = 'open' | 'acknowledged' | 'replied' | 'closed';

export interface FeedbackItem {
  id: string;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
  category: FeedbackCategory;
  message: string;
  project_id?: string | null;
  route?: string | null;
  page_url?: string | null;
  status: FeedbackStatus;
  admin_reply?: string | null;
  created_at: string;
  updated_at?: string | null;
  replied_at?: string | null;
}

export const FEEDBACK_CATEGORIES: Array<{ id: FeedbackCategory; label: string }> = [
  { id: 'bug', label: 'Bug' },
  { id: 'idea', label: 'Idea' },
  { id: 'praise', label: 'Praise' },
  { id: 'billing', label: 'Billing' },
  { id: 'other', label: 'Other' },
];

export async function submitFeedback(input: {
  message: string;
  category: FeedbackCategory;
  projectId?: string | null;
  route?: string | null;
  pageUrl?: string | null;
}): Promise<FeedbackItem> {
  if (!getStoredToken()) {
    throw new Error('Sign in to send feedback.');
  }
  const res = await fetch(`${API_V1}/feedback`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input.message,
      category: input.category,
      project_id: input.projectId || undefined,
      route: input.route || undefined,
      page_url: input.pageUrl || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const failure = parseApiFailure(res.status, body);
    throw new Error(failure.message || 'Could not send feedback.');
  }
  return res.json();
}

export async function fetchAdminWhoami(): Promise<{ is_admin: boolean; email?: string | null }> {
  const res = await fetch(`${API_V1}/admin/whoami`, { headers: getAuthHeaders() });
  if (!res.ok) {
    return { is_admin: false };
  }
  return res.json();
}

export async function listAdminFeedback(opts?: {
  status?: FeedbackStatus | '';
  limit?: number;
}): Promise<FeedbackItem[]> {
  const qs = new URLSearchParams();
  if (opts?.status) qs.set('status', opts.status);
  if (opts?.limit) qs.set('limit', String(opts.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await fetch(`${API_V1}/admin/feedback${suffix}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const failure = parseApiFailure(res.status, body);
    throw new Error(failure.message || 'Could not load feedback.');
  }
  return res.json();
}

export async function updateAdminFeedback(
  id: string,
  patch: { status?: FeedbackStatus; admin_reply?: string },
): Promise<FeedbackItem> {
  const res = await fetch(`${API_V1}/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const failure = parseApiFailure(res.status, body);
    throw new Error(failure.message || 'Could not update feedback.');
  }
  return res.json();
}
