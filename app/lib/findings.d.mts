export type Tone = 'ok' | 'info' | 'warn';
export interface LineVisual { type: 'line'; x: string[]; series: Array<{ name: string; role: 'main' | 'baseline' | 'fit'; values: Array<number | null> }>; highlight: number[]; yLabel: string; format: 'number' | 'percent' }
export interface BarsVisual { type: 'bars'; items: Array<{ label: string; value: number; n: number | null; highlight: boolean }>; baseline: number | null; baselineLabel: string; format: 'number' | 'percent' }
export interface ScatterVisual { type: 'scatter'; points: Array<[number, number]>; xLabel: string; yLabel: string; fit: Array<[number, number]> | null; r: number | null }
export interface BandVisual { type: 'band'; low: number; high: number; center: number; values: Array<{ label: string; value: number; flag: boolean }>; format: 'number' | 'percent' }
export interface MeterVisual { type: 'meter'; parts: Array<{ label: string; value: number; tone: 'ok' | 'warn' }>; total: number }
export type Visual = LineVisual | BarsVisual | ScatterVisual | BandVisual | MeterVisual;
export interface Finding {
  id: string; kind: string; kindLabel: string; title: string; soWhat: string; headline: string; reasoning: string[]; why: string[];
  confidence: string; confidenceLabel: string; confidenceTone: Tone; confidenceNote: string; strength: number; visual: Visual | null;
  figures: Array<{ label: string; value: string; n: number | null; note: string }>; sql: string; followups: string[];
  source: { table: string; origin: 'project' | 'online'; url: string };
  provenance: { host: string; publisher: string; publisherLabel: string; fetchedAt: string; latest: string | null } | null;
}
export interface FindingsScope {
  mode: 'project' | 'online';
  sources: Array<{ table: string; title: string; url: string; host: string; publisher: string; publisherLabel: string; fetchedAt: string; latest: string | null; rowsLoaded: number; rowsTotal: number | null; notes: string[] }>;
  account: string[];
}
export interface ParsedFindings {
  findings: Finding[];
  checked: { analyses: number; queries: number; byKind: Record<string, number>; tables: Array<{ name: string; rows: number; total: number }> };
  partial: Array<{ table: string; loaded: number; total: number }>;
  notes: string[];
  scope: FindingsScope;
}
export interface RunStep { id: string; label: string; state: 'pending' | 'running' | 'done'; detail: string }
export const MAX_FINDINGS: number; export const MAX_POINTS: number; export const MAX_BARS: number; export const MAX_SCATTER: number; export const MAX_FIGURES: number;
export const STEP_DEFS: Array<{ id: string; label: string }>;
export const STEP_DEFS_ONLINE: Array<{ id: string; label: string }>;
export function safeUrl(u: unknown): string;
export function parseVisual(v: unknown): Visual | null;
export function parseFindings(payload: unknown): ParsedFindings | null;
export function confidenceMeta(c: string): { label: string; tone: Tone };
export function checkedLine(parsed: ParsedFindings | null): string;
export function breakdownLine(parsed: ParsedFindings | null): string;
export function onlineNotice(parsed: ParsedFindings | null): string;
export function provenanceLine(f: Finding | null | undefined): string;
export function sourceLines(src: FindingsScope['sources'][number] | null | undefined): string[];
export function partialLine(parsed: ParsedFindings | null): string;
export function formatNumber(v: number | null | undefined, format?: 'number' | 'percent'): string;
export function formatPeriod(label: unknown): string;
export function lineGeometry(v: LineVisual, width: number, height?: number, pad?: { l: number; r: number; t: number; b: number }): {
  width: number; height: number; plot: { l: number; r: number; t: number; b: number };
  series: Array<{ name: string; role: string; path: string; points: Array<{ x: number; y: number; i: number; v: number }> }>;
  xTicks: Array<{ x: number; label: string; i: number }>; yTicks: Array<{ y: number; label: string }>;
  highlight: Array<{ i: number; x: number; y: number; value: number; valueLabel: string; label: string }>;
};
export function barsGeometry(v: BarsVisual): { rows: Array<{ label: string; value: number; valueLabel: string; n: number | null; highlight: boolean; pct: number }>; baselinePct: number | null; baselineLabel: string; baselineValue: string };
export function meterGeometry(v: MeterVisual): { parts: Array<{ label: string; value: number; tone: 'ok' | 'warn'; pct: number; valueLabel: string }>; total: number };
export function scatterGeometry(v: ScatterVisual, width: number, height?: number, pad?: { l: number; r: number; t: number; b: number }): {
  width: number; height: number; plot: { l: number; r: number; t: number; b: number }; points: Array<{ x: number; y: number }>;
  fit: Array<[number, number]> | null; xTicks: Array<{ x: number; label: string }>; yTicks: Array<{ y: number; label: string }>;
};
export function bandGeometry(v: BandVisual, width: number, pad?: { l: number; r: number }): {
  width: number; bandL: number; bandR: number; center: number; lowLabel: string; highLabel: string; centerLabel: string;
  points: Array<{ x: number; row: number; label: string; valueLabel: string; flag: boolean }>;
};
export function chartAlt(f: Finding): string;
export function stepIndex(current: number | undefined, key: string, count: number): number;
export function reduceSteps(prev: RunStep[] | undefined, payload: Record<string, unknown>): RunStep[];
export function discoveryStatus(payload: Record<string, unknown>): string;
export function isDiscoveryRoute(reason: unknown): boolean;
export function withoutFindingList(text: string): string;
