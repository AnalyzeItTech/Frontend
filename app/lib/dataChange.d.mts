export interface ChangeProposal {
  action?: string;
  api_name?: string;
  record_id?: string;
  data?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  base_version?: number;
}
export interface ChangeRow { field: string; before: unknown; after: unknown; changed: boolean }
export interface ChangeDescription {
  action: 'create' | 'update' | 'delete' | 'unknown';
  object: string;
  recordId: string | null;
  headline: string;
  rows: ChangeRow[];
  notes: string[];
  canApprove: boolean;
  changedCount: number;
}
export function formatValue(v: unknown, max?: number): string;
export function describeChange(p: ChangeProposal | null | undefined): ChangeDescription;
export function explainApplyError(status: number, message?: string): string;
