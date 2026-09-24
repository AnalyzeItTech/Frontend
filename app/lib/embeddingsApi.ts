const API_V1 = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1`;

export type EmbeddingJob = {
  job_id: string;
  status: string;
  tier: number;
  tier_reason?: string;
  token_estimate: number;
  tokens_processed: number;
  percent: number;
  eta_seconds?: number | null;
  shards_done?: number;
  shards_total?: number;
  error?: string | null;
  embedding_model?: string;
  cost_actual_usd?: number | null;
};

export type EmbeddingUsage = {
  tier: string;
  monthly_tokens_processed: number;
  monthly_cap: number;
  reset_at: string;
  storage_tokens_current: number;
  storage_cap: number;
  warn_monthly: boolean;
  warn_storage: boolean;
};

export type EmbeddedSource = {
  job_id: string;
  source?: { type?: string; ref_id?: string | null };
  token_estimate?: number;
  tokens_processed?: number;
  status?: string;
  last_accessed_at?: string | null;
  evicted?: boolean;
  embedding_model?: string;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('analyzeit_token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function estimateEmbedding(text: string, tokenEstimate?: number): Promise<{ job?: EmbeddingJob; detail?: unknown }> {
  const res = await fetch(`${API_V1}/embeddings/estimate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text, token_estimate: tokenEstimate }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('estimate_failed') as Error & { status: number; detail: unknown };
    err.status = res.status;
    err.detail = data.detail ?? data;
    throw err;
  }
  return data;
}

export async function fetchEmbeddingJob(jobId: string): Promise<EmbeddingJob> {
  const res = await fetch(`${API_V1}/embeddings/jobs/${jobId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('job_not_found');
  return res.json();
}

export async function cancelEmbeddingJob(jobId: string): Promise<EmbeddingJob> {
  const res = await fetch(`${API_V1}/embeddings/jobs/${jobId}/cancel`, { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new Error('cancel_failed');
  return res.json();
}

export async function fetchEmbeddingUsage(): Promise<EmbeddingUsage> {
  const res = await fetch(`${API_V1}/embeddings/usage`, { headers: authHeaders() });
  if (!res.ok) throw new Error('usage_failed');
  return res.json();
}

export async function deleteEmbeddedSource(jobId: string): Promise<void> {
  const res = await fetch(`${API_V1}/embeddings/sources/${jobId}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error('delete_failed');
}

export async function fetchEmbeddedSources(): Promise<EmbeddedSource[]> {
  const res = await fetch(`${API_V1}/embeddings/sources`, { headers: authHeaders() });
  if (!res.ok) throw new Error('sources_failed');
  const data = await res.json();
  return data.sources || [];
}
