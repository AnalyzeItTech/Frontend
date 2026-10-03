export interface ViewField { api_name: string; type: string; label?: string; required?: boolean; unique?: boolean }
export interface FilterRow { field: string; operator: string; value: unknown }
export interface ApiFilter { field: string; operator: string; value: unknown }
export const OPERATOR_LABELS: Record<string, string>;
export const INLINE_EDITABLE: Set<string>;
export function operatorsForType(type: string): string[];
export function buildFilters(rows: FilterRow[], fields: ViewField[]): ApiFilter[];
export function emptyFilterRow(fields: ViewField[]): FilterRow;
export function toggleId(selected: Set<string>, id: string): Set<string>;
export function toggleAll(selected: Set<string>, visibleIds: string[]): Set<string>;
export function pruneSelection(selected: Set<string>, visibleIds: string[]): Set<string>;
export function selectionState(selected: Set<string>, visibleIds: string[]): { count: number; all: boolean; some: boolean };
export function visibleFields<T extends ViewField>(fields: T[], hidden: string[]): T[];
export function toggleHidden(hidden: string[], apiName: string, fields: ViewField[]): string[];
export function loadHidden(storage: Pick<Storage, 'getItem'> | null | undefined, projectId: string, schemaId: string): string[];
export function saveHidden(storage: Pick<Storage, 'setItem'> | null | undefined, projectId: string, schemaId: string, hidden: string[]): void;
export function canEditInline(field: ViewField | undefined): boolean;
export function parseInlineValue(field: ViewField, raw: unknown): { ok: true; value: unknown } | { ok: false; error: string };
export function duplicateValues(fields: ViewField[], values: Record<string, unknown>): Record<string, unknown>;
export function plural(n: number, one: string, many?: string): string;
