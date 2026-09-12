import { getAuthHeaders } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export const SUPPORTED_DATASET_EXTENSIONS = [
  'csv', 'tsv', 'txt', 'dsv', 'psv', 'tab',
  'json', 'ndjson', 'jsonl',
  'xlsx', 'xlsm',
  'pdf',
  'twb', 'twbx',
] as const;

export const DATASET_ACCEPT_ATTR = SUPPORTED_DATASET_EXTENSIONS.map((e) => `.${e}`).join(',');

export interface DatasetColumn {
  api_name: string;
  label: string;
  type: string;
}

export interface Dataset {
  id: string;
  project_id: string;
  object_id: string;
  object_api_name: string;
  filename: string;
  source_format: string;
  byte_size: number;
  column_count: number;
  row_count: number;
  rejected_rows: number;
  truncated: boolean;
  notes: string[];
  columns: DatasetColumn[];
  uploaded_by?: string;
  created_at?: string;
}

export async function uploadDataset(projectId: string, file: File): Promise<Dataset> {
  const body = new FormData();
  body.append('file', file);

  // Content-Type is intentionally omitted so the browser sets the multipart boundary.
  const res = await fetch(`${API_V1}/projects/${projectId}/datasets`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Could not import ${file.name}.`);
  }
  return res.json();
}

export async function fetchDatasets(projectId: string): Promise<Dataset[]> {
  const res = await fetch(`${API_V1}/projects/${projectId}/datasets`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteDataset(
  projectId: string,
  datasetId: string,
  purgeRecords = true,
): Promise<boolean> {
  const res = await fetch(
    `${API_V1}/projects/${projectId}/datasets/${datasetId}?purge_records=${purgeRecords}`,
    { method: 'DELETE', headers: { ...getAuthHeaders() } },
  );
  return res.ok;
}

export function describeDataset(dataset: Dataset): string {
  const parts = [
    `${dataset.row_count.toLocaleString()} row${dataset.row_count === 1 ? '' : 's'}`,
    `${dataset.column_count} column${dataset.column_count === 1 ? '' : 's'}`,
  ];
  return parts.join(' · ');
}
