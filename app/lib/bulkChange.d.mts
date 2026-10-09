export interface BulkSample { id: string; label: string; changes: Array<{ field: string; before: unknown; after: unknown }> }
export interface BulkProposal {
  action: 'update' | 'delete';
  object: string;
  matched: number;
  willChange: number;
  unchanged: number;
  where: string[];
  set: Array<{ field: string; value: unknown }>;
  summary: Array<{ field: string; after: unknown; from: Array<{ value: string; count: number }> }>;
  sample: BulkSample[];
  undoDays: number;
  previewId: string;
}
export const MAX_SAMPLE_ROWS: number;
export function parseBulkProposal(p: unknown): BulkProposal | null;
export function bulkHeadline(b: BulkProposal): string;
export function bulkTransitions(b: BulkProposal): Array<{ field: string; from: string; to: string }>;
export function bulkNotes(b: BulkProposal): string[];
export function bulkResultLine(res: unknown): string;
export function undoResultLine(res: unknown): string;
export function explainBulkError(status: number, message?: string): string;
