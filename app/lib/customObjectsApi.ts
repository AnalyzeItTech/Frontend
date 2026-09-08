import { getAuthHeaders } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  status: 'connected' | 'error' | 'disconnected';
  sync_frequency?: string;
  last_sync_at?: string;
  error_message?: string;
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/objects`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/objects`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/objects/${identifier}`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/objects/${identifier}`, {
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
    `${API_BASE}/projects/${projectId}/objects/${schemaId}/records?${params.toString()}`,
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
  const res = await fetch(`${API_BASE}/records/${recordId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to fetch record detail: ${res.statusText}`);
  return res.json();
}

export async function fetchRelatedRecords(recordId: string): Promise<RelatedRecordsResponse> {
  const res = await fetch(`${API_BASE}/records/${recordId}/related`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/objects/${schemaId}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ data, values: data, origin: 'manual' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create record');
  }
  return res.json();
}

export async function updateRecord(
  projectId: string,
  schemaId: string,
  recordId: string,
  data: Record<string, any>
): Promise<ObjectRecord> {
  const res = await fetch(
    `${API_BASE}/records/${recordId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ data, values: data }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update record');
  }
  return res.json();
}

export async function deleteRecord(
  projectId: string,
  schemaId: string,
  recordId: string,
  strategy: string = 'nullify'
): Promise<{ ok: boolean; deleted: boolean; unlinked_references?: number }> {
  const res = await fetch(
    `${API_BASE}/records/${recordId}?strategy=${strategy}`,
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

// ─── Live Connectors Fetchers ──────────────────────────────────────────────────

export async function fetchAvailableConnectors(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/connectors/available`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjectConnectors(projectId: string): Promise<Connector[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/connectors`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function authorizeConnector(
  projectId: string,
  provider: string,
  redirectUri: string
): Promise<{ auth_url: string; state: string }> {
  const res = await fetch(`${API_BASE}/connectors/${provider}/authorize`, {
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

export async function syncConnector(connectorId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/connectors/${connectorId}/sync`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function revokeConnector(connectorId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/connectors/${connectorId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.ok;
}

// ─── Module Library & Pipeline Fetchers ────────────────────────────────────────

export async function fetchModuleLibrary(category?: string): Promise<ModuleTemplate[]> {
  const url = category
    ? `${API_BASE}/modules/library?category=${category}`
    : `${API_BASE}/modules/library`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjectPipeline(projectId: string): Promise<ProjectPipeline> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/pipeline`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/modules/install`, {
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/modules/${instanceId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.ok;
}
