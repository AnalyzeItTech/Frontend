import { getAuthHeaders } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

/** An API failure with the HTTP status and, for quota errors, the structured payload. */
export class ApiError extends Error {
  status: number;
  code?: string;
  upgradeRequired: boolean;
  constructor(message: string, status: number, code?: string, upgradeRequired = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.upgradeRequired = upgradeRequired;
  }
  get isConflict() {
    return this.status === 409;
  }
}

/** FastAPI `detail` can be a string, a {message, code} object, or a validation-error list. */
export async function apiErrorFrom(res: Response, fallback: string): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  let message = fallback;
  let code: string | undefined;
  let upgrade = false;
  if (typeof detail === 'string') message = detail;
  else if (Array.isArray(detail)) message = detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join('; ') || fallback;
  else if (detail && typeof detail === 'object') {
    message = detail.message || fallback;
    code = detail.code;
    upgrade = Boolean(detail.upgrade_required);
  }
  return new ApiError(message, res.status, code, upgrade);
}

export interface ObjectField {
  api_name: string;
  name?: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'email' | 'url' | 'picklist' | 'lookup' | 'select' | 'relation';
  required?: boolean;
  unique?: boolean;
  reference_object?: string;
  relation_target_object_id?: string;
  options?: string[];
  default?: any;
}

export interface ObjectSchema {
  id: string;
  project_id: string;
  api_name: string;
  name?: string;
  label: string;
  label_plural?: string;
  fields: ObjectField[];
  source?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedRelation {
  id: string;
  object_id?: string;
  object_api_name?: string;
  object_label?: string;
  display_label: string;
  data?: Record<string, any>;
  values?: Record<string, any>;
  unresolved?: boolean;
}

export interface ObjectRecord {
  id: string;
  project_id: string;
  object_id?: string;
  object_api_name?: string;
  data: Record<string, any>;
  values?: Record<string, any>;
  resolved_relations?: Record<string, ResolvedRelation>;
  origin: string;
  external_id?: string;
  overridden_fields?: string[];
  /** Optimistic-concurrency counter; send it back as expected_version when editing. */
  version?: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedGroup {
  object_id: string;
  object_api_name: string;
  object_label: string;
  field_name: string;
  field_label: string;
  records: ObjectRecord[];
  count: number;
}

export interface RelatedRecordsResponse {
  record_id: string;
  object_id?: string;
  object_api_name?: string;
  related: RelatedGroup[];
}

export interface Connector {
  id: string;
  project_id: string;
  provider: string;
  name?: string;
  status: 'connected' | 'error' | 'disconnected' | 'healthy';
  sync_frequency?: string;
  last_sync_at?: string;
  error_message?: string;
  data_mode?: 'preview' | 'seed_demo' | 'live_readonly' | string;
  live_pull_available?: boolean;
  seed_demo_sync_allowed?: boolean;
  auth_mode?: 'oauth' | 'connection' | 'catalog' | string;
  connection_meta?: Record<string, string | number>;
  objects_discovered?: Array<{
    api_name: string;
    label: string;
    fields: ObjectField[];
  }>;
}

export interface ModuleTemplate {
  id: string;
  name: string;
  category: string;
  version: number;
  description: string;
  provides: string[];
  requires: string[];
  objects: Array<{
    api_name: string;
    label: string;
    fields: ObjectField[];
  }>;
  screens: Array<{
    api_name: string;
    title: string;
    type: string;
    component?: string;
  }>;
}

export interface ProjectPipeline {
  project_id: string;
  modules: Array<{
    instance_id: string;
    module_id: string;
    order: number;
    depends_on: string[];
  }>;
  provided_capabilities: string[];
}

// ─── Custom Objects & Schema Fetchers ──────────────────────────────────────────

export async function fetchObjectSchemas(projectId: string): Promise<ObjectSchema[]> {
  const res = await fetch(`${API_V1}/projects/${projectId}/objects`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to fetch object schemas: ${res.statusText}`);
  return res.json();
}

export async function createObjectSchema(
  projectId: string,
  payload: {
    api_name: string;
    name?: string;
    label: string;
    label_plural?: string;
    fields: ObjectField[];
  }
): Promise<ObjectSchema> {
  const res = await fetch(`${API_V1}/projects/${projectId}/objects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create object schema');
  }
  return res.json();
}

export async function updateObjectSchema(
  projectId: string,
  identifier: string,
  payload: {
    label?: string;
    label_plural?: string;
    fields?: ObjectField[];
    expected_version?: number;
  }
): Promise<ObjectSchema> {
  const res = await fetch(`${API_V1}/projects/${projectId}/objects/${identifier}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update object schema');
  }
  return res.json();
}

export async function deleteObjectSchema(projectId: string, identifier: string): Promise<boolean> {
  const res = await fetch(`${API_V1}/projects/${projectId}/objects/${identifier}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.ok;
}

// ─── Records Fetchers ─────────────────────────────────────────────────────────

export interface RecordsResponse {
  records: ObjectRecord[];
  total: number;
  limit: number;
  skip: number;
  has_more: boolean;
}

export async function fetchRecords(
  projectId: string,
  schemaId: string,
  limit: number = 50,
  skip: number = 0,
  sortBy: string = 'created_at',
  sortDesc: boolean = true,
  search?: string
): Promise<RecordsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    sort_by: sortBy,
    sort_desc: String(sortDesc),
  });
  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  const res = await fetch(
    `${API_V1}/projects/${projectId}/objects/${schemaId}/records?${params.toString()}`,
    {
      headers: { ...getAuthHeaders() },
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch records: ${res.statusText}`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return { records: data, total: data.length, limit, skip, has_more: false };
  }
  return {
    records: data.records || [],
    total: data.total ?? (data.records?.length || 0),
    limit: data.limit ?? limit,
    skip: data.skip ?? skip,
    has_more: Boolean(data.has_more),
  };
}

export async function fetchRecordDetail(recordId: string): Promise<ObjectRecord> {
  const res = await fetch(`${API_V1}/records/${recordId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to fetch record detail: ${res.statusText}`);
  return res.json();
}

export async function fetchRelatedRecords(recordId: string): Promise<RelatedRecordsResponse> {
  const res = await fetch(`${API_V1}/records/${recordId}/related`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return { record_id: recordId, related: [] };
  return res.json();
}

export async function createRecord(
  projectId: string,
  schemaId: string,
  data: Record<string, any>
): Promise<ObjectRecord> {
  const res = await fetch(`${API_V1}/projects/${projectId}/objects/${schemaId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ data, values: data, origin: 'manual' }),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Failed to create record');
  return res.json();
}

export async function updateRecord(
  projectId: string,
  schemaId: string,
  recordId: string,
  data: Record<string, any>,
  expectedVersion?: number
): Promise<ObjectRecord> {
  const res = await fetch(
    `${API_V1}/records/${recordId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ data, values: data, ...(expectedVersion != null ? { expected_version: expectedVersion } : {}) }),
    }
  );
  if (!res.ok) throw await apiErrorFrom(res, 'Failed to update record');
  return res.json();
}

export async function deleteRecord(
  projectId: string,
  schemaId: string,
  recordId: string,
  strategy: string = 'nullify'
): Promise<{ ok: boolean; deleted: boolean; unlinked_references?: number }> {
  const res = await fetch(
    `${API_V1}/records/${recordId}?strategy=${strategy}`,
    {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to delete record');
  }
  return res.json();
}

// ─── Filtered query, bulk, trash, import / export ─────────────────────────────

export interface RecordFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface QueryRecordsParams {
  filters?: RecordFilter[];
  search?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortDesc?: boolean;
  /** "only" lists the trash. */
  deleted?: 'exclude' | 'only' | 'include';
}

export async function queryRecords(projectId: string, schemaId: string, p: QueryRecordsParams = {}): Promise<RecordsResponse> {
  const res = await fetch(`${API_V1}/objects/${schemaId}/records/query?project_id=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      filters: p.filters ?? [],
      search: p.search?.trim() || null,
      limit: p.limit ?? 50,
      skip: p.skip ?? 0,
      sort_by: p.sortBy ?? 'created_at',
      sort_desc: p.sortDesc ?? true,
      deleted: p.deleted ?? 'exclude',
    }),
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Failed to load records');
  const data = await res.json();
  return {
    records: data.records || [],
    total: data.total ?? 0,
    limit: data.limit ?? p.limit ?? 50,
    skip: data.skip ?? p.skip ?? 0,
    has_more: Boolean(data.has_more),
  };
}

async function postJson<T>(path: string, projectId: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(`${API_V1}${path}?project_id=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiErrorFrom(res, fallback);
  return res.json();
}

/** Soft delete: records go to the trash for 30 days and can be restored. */
export function bulkDeleteRecords(projectId: string, schemaId: string, ids: string[]) {
  return postJson<{ deleted: number; requested: number }>(`/objects/${schemaId}/records/bulk-delete`, projectId, { ids }, 'Failed to delete records');
}

export function restoreRecords(projectId: string, schemaId: string, ids: string[]) {
  return postJson<{ restored: number; requested: number }>(`/objects/${schemaId}/records/restore`, projectId, { ids }, 'Failed to restore records');
}

export interface BulkResult {
  created?: number;
  updated?: number;
  failed: number;
  errors: { index?: number; row?: number; id?: string; error: string; conflict?: boolean }[];
}

export function bulkUpdateRecords(
  projectId: string,
  schemaId: string,
  updates: { id: string; values: Record<string, unknown>; expected_version?: number }[],
) {
  return postJson<BulkResult>(`/objects/${schemaId}/records/bulk-update`, projectId, { updates }, 'Failed to update records');
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportRecords(projectId: string, schemaId: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
  const res = await fetch(
    `${API_V1}/objects/${schemaId}/export?format=${format}&project_id=${encodeURIComponent(projectId)}`,
    { headers: { ...getAuthHeaders() } },
  );
  if (!res.ok) throw await apiErrorFrom(res, 'Export failed');
  const disposition = res.headers.get('content-disposition') || '';
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || `${schemaId}.${format}`;
  saveBlob(await res.blob(), name);
}

export interface ImportResult extends BulkResult {
  created: number;
  unmapped_columns: string[];
  row_limit_hit?: boolean;
}

export async function importRecords(projectId: string, schemaId: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_V1}/objects/${schemaId}/import?project_id=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }, // no Content-Type: the browser sets the multipart boundary
    body: form,
  });
  if (!res.ok) throw await apiErrorFrom(res, 'Import failed');
  return res.json();
}

// ─── Live Connectors Fetchers ──────────────────────────────────────────────────

export async function fetchAvailableConnectors(): Promise<any[]> {
  const res = await fetch(`${API_V1}/connectors/available`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjectConnectors(
  projectId: string,
  options?: { strict?: boolean },
): Promise<Connector[]> {
  const res = await fetch(`${API_V1}/projects/${projectId}/connectors`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    if (options?.strict) throw new Error('Could not load connectors for this project.');
    return [];
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    if (options?.strict) throw new Error('Could not load connectors for this project.');
    return [];
  }
  return data;
}

export async function authorizeConnector(
  projectId: string,
  provider: string,
  redirectUri: string
): Promise<{ auth_url: string; state: string }> {
  const res = await fetch(`${API_V1}/connectors/${provider}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ project_id: projectId, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to initiate authorization');
  }
  return res.json();
}

function connectorError(err: { detail?: unknown }, fallback: string): string {
  if (typeof err.detail === 'string') return err.detail;
  return fallback;
}

export async function connectProvider(
  projectId: string,
  provider: string,
  connection: Record<string, unknown>,
  name?: string
): Promise<Connector> {
  const res = await fetch(`${API_V1}/connectors/${provider}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ project_id: projectId, connection, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(connectorError(err, 'Failed to connect'));
  }
  return res.json();
}

export async function connectSqlConnector(
  projectId: string,
  provider: 'postgres' | 'sqlite',
  connection: Record<string, unknown>,
  name?: string
): Promise<Connector> {
  return connectProvider(projectId, provider, connection, name);
}

export async function fetchConnector(connectorId: string): Promise<Connector> {
  const res = await fetch(`${API_V1}/connectors/${connectorId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(connectorError(err, 'Failed to load connector'));
  }
  return res.json();
}

export async function updateConnector(
  connectorId: string,
  patch: Record<string, unknown>
): Promise<Connector> {
  const res = await fetch(`${API_V1}/connectors/${connectorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(connectorError(err, 'Failed to update connector'));
  }
  return res.json();
}

export async function testSqlConnector(connectorId: string): Promise<{ ok: boolean; sample?: any }> {
  const res = await fetch(`${API_V1}/connectors/${connectorId}/test`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Connection test failed');
  }
  return res.json();
}

export async function syncConnector(connectorId: string): Promise<any> {
  const res = await fetch(`${API_V1}/connectors/${connectorId}/sync`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.note || 'Sync failed');
  }
  return res.json();
}

export async function revokeConnector(connectorId: string): Promise<boolean> {
  const res = await fetch(`${API_V1}/connectors/${connectorId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.ok;
}

// ─── Module Library & Pipeline Fetchers ────────────────────────────────────────

export async function fetchModuleLibrary(category?: string): Promise<ModuleTemplate[]> {
  const url = category
    ? `${API_V1}/modules/library?category=${category}`
    : `${API_V1}/modules/library`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjectPipeline(projectId: string): Promise<ProjectPipeline> {
  const res = await fetch(`${API_V1}/projects/${projectId}/pipeline`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return { project_id: projectId, modules: [], provided_capabilities: [] };
  return res.json();
}

export async function installProjectModule(
  projectId: string,
  moduleId: string,
  overrides?: Record<string, any>
): Promise<any> {
  const res = await fetch(`${API_V1}/projects/${projectId}/modules/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ module_id: moduleId, overrides: overrides || {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to install module');
  }
  return res.json();
}

export async function uninstallProjectModule(
  projectId: string,
  instanceId: string
): Promise<boolean> {
  const res = await fetch(`${API_V1}/projects/${projectId}/modules/${instanceId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.ok;
}
