export type MathMethod = 'regression' | 'forecast' | 'what_if';
export type MathStepState = 'done' | 'running' | 'failed' | 'unwired' | 'pending';

export interface MathKpi {
  label: string;
  value: string;
  note: string;
}

export interface MathBlock {
  method: MathMethod;
  methodLabel: string;
  tool: string | null;
  kpis: MathKpi[];
  assumptions: string[];
  caveat: string;
  chartRef: string | null;
  chartCaption: string;
  mathStatus: MathStepState;
  target: string;
  structured: {
    method: MathMethod;
    kpis: MathKpi[];
    assumptions: string[];
    chartRef: string | null;
    caveat: string;
    sources: string[];
  };
}

export interface MathStep {
  id: string;
  method: MathMethod;
  label: string;
  state: MathStepState;
  detail: string;
  findingId: string;
}

export const MATH_METHODS: readonly MathMethod[];
export const TOOL_TO_METHOD: Record<string, MathMethod>;
export const METHOD_LABEL: Record<MathMethod, string>;
export const DEFAULT_CAVEAT: Record<MathMethod, string>;
export const MATH_BANNED: RegExp[];

export function resolveMathMethod(tool: unknown, method: unknown, kind: unknown): MathMethod | null;
export function assumptionsFromPayload(assumptions: unknown, params: unknown): string[];
export function deriveKpis(
  method: MathMethod,
  figures: Array<{ label: string; value: string; n: number | null; note: string }>,
  visual: Record<string, unknown> | null,
  metrics: Record<string, unknown> | null,
): MathKpi[];
export function parseMathBlock(raw: Record<string, unknown>): MathBlock | null;
export function isMathFinding(f: { math?: MathBlock | null } | null | undefined): boolean;
export function mathProvenanceLine(math: { methodLabel?: string; tool?: string | null } | null | undefined): string;
export function mathCardTitle(math: { methodLabel: string; target?: string } | null | undefined, title: string): string;
export function copyMathFindingSummary(
  f: { math?: MathBlock | null; title: string; source?: { table: string; origin: string }; provenance?: { host: string } | null },
  opts?: { sourceTitles?: string[] },
): string;
export function copyAllMathSummaries(data: {
  findings: Array<{ math?: MathBlock | null; title: string; id: string; source?: { table: string; origin: string }; provenance?: { host: string } | null }>;
  scope?: { sources: Array<{ title: string; host: string; table: string }> };
} | null | undefined): string;
export function buildMathSteps(payloadSteps: unknown, findings?: Array<{ id: string; math?: MathBlock | null }>): MathStep[];
export function mathStepStatusLabel(state: MathStepState): string;
export function findBannedMathPhrases(text: string): string[];
