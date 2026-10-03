export type WidgetLike = Record<string, any> & { id: string };
export interface Table { columns: string[]; rows: unknown[][] }
export interface DateRange { from: Date | null; to: Date | null }
export interface DateFilterState { preset: string; from: string; to: string }
export const DATE_PRESETS: { id: string; label: string }[];
export const WIDGET_CATALOG: { type: string; label: string; description: string; build: (id: string) => WidgetLike }[];
export function extractTable(widget: unknown): Table | null;
export function tableToCsv(columns: unknown[], rows: unknown[][]): string;
export function csvFilename(title?: string, fallback?: string): string;
export function resolveDateRange(preset: string, now?: Date, custom?: { from?: string; to?: string }): DateRange;
export function parseDate(value: unknown): Date | null;
export function inRange(date: Date, range: DateRange): boolean;
export function isDateFilterable(widget: unknown): boolean;
export function applyDateRange<T>(widget: T, range: DateRange): T;
export function loadDateFilter(storage: Pick<Storage, 'getItem'> | null | undefined, projectId?: string): DateFilterState;
export function saveDateFilter(storage: Pick<Storage, 'setItem'> | null | undefined, projectId: string | undefined, filter: DateFilterState): void;
export function moveIndex(from: number, to: number, length: number): { from: number; to: number } | null;
export function reorder<T>(items: T[], from: number, to: number): T[];
export function objectTableWidget(id: string, projectId: string, objectApiName: string, label?: string): WidgetLike;
export function newWidgetId(prefix?: string): string;
