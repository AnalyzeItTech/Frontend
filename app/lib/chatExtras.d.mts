export interface ParsedChart {
  type: 'line' | 'bar';
  title: string;
  unit: string;
  xLabel: string;
  source: string;
  sourceUrl: string;
  series: Array<{ name: string; points: Array<[number, number]> }>;
  categories?: string[];
}
export interface ResultTable {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  /** Rows in the full result; the table shows the first ones. */
  totalRows: number;
}
export interface ParsedPlace {
  name: string;
  lat: number;
  lon: number;
}
export interface ParsedExtras {
  charts: ParsedChart[];
  tables: ResultTable[];
  places: ParsedPlace[];
  suggestions: string[];
}
export interface ChartGeometry {
  width: number;
  height: number;
  pad: { l: number; r: number; t: number; b: number };
  series: Array<{ name: string; color: string; d: string; points: Array<{ x: number; y: number; xv: number | string; yv: number }> }>;
  yTicks: Array<{ v: number; y: number }>;
  xTicks: Array<{ v: number | string; x: number }>;
  /** Pixels per x unit (bar width is derived from it). */
  unitPx: number;
  baselineY: number;
}
export interface ParsedTable {
  header: string[];
  align: Array<'left' | 'right' | 'center'>;
  rows: string[][];
  next: number;
}
export const SERIES_COLORS: string[];
export function parseExtras(payload: unknown): ParsedExtras;
export function niceTicks(min: number, max: number, count?: number): number[];
export function chartGeometry(
  chart: Pick<ParsedChart, 'type' | 'series'>,
  width?: number,
  height?: number,
  pad?: { l: number; r: number; t: number; b: number },
): ChartGeometry;
export function formatValue(v: number, unit?: string): string;
export function safeHref(url: unknown): string | null;
export function parseTableAt(lines: string[], i: number): ParsedTable | null;
