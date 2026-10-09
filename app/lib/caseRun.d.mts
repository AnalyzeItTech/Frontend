import type { ParsedFindings, RunStep } from './findings.mjs';
export type CaseEvent =
  | { type: 'reset' }
  | { type: 'started'; title: string; question: string; source: string }
  | { type: 'progress'; payload: Record<string, unknown> }
  | { type: 'final'; text: string; findings: ParsedFindings | null }
  | { type: 'saved'; path: string; expiresAt: string }
  | { type: 'unavailable'; message: string }
  | { type: 'error'; message: string };
export interface RunState { status: 'idle' | 'running' | 'answered' | 'unavailable' | 'error'; title: string; question: string; steps: RunStep[]; text: string; findings: ParsedFindings | null; saved: { path: string; expiresAt: string } | null; message: string }
export const initialRun: RunState;
export function parseCaseLine(line: string): CaseEvent | null;
export function reduceRun(state: RunState, ev: CaseEvent | null): RunState;
export function stepsFromActivity(activity: unknown): RunStep[];
export function explainCaseFailure(status: number, detail: unknown): { message: string; signup: boolean };
