export const FREE_CLIENT_CONTEXT_CHARS: number;
export const CLIENT_CONTEXT_TRUNCATED: 'CLIENT_CONTEXT_TRUNCATED';
export const PIPELINE_INSUFFICIENT_DATA: 'PIPELINE_INSUFFICIENT_DATA';
export const PIPELINE_FAIL_TEXT: string;

export const CONTEXT_UPGRADE_COPY: {
  title: string;
  body: string;
};

export type ContextWallSignal = {
  code?: 'CLIENT_CONTEXT_TRUNCATED' | 'PIPELINE_INSUFFICIENT_DATA';
  truncated: boolean;
  pipeline: boolean;
  upgradeRequired: boolean;
  recoverable: boolean;
  openUpgrade: boolean;
  softFail: boolean;
  message?: string;
};

export function readStructuredSignal(payload: unknown): {
  codes: string[];
  upgradeRequired: boolean;
  recoverable: boolean;
  recoverableExplicitFalse: boolean;
  message: string;
} | null;

export function isContextWallCode(code: string): boolean;
export function isQuotaCode(code: string): boolean;
export function detectContextWall(payload: unknown): ContextWallSignal | null;
export function readQuotaSignal(payload: unknown): {
  code: string;
  message: string;
  upgradeRequired: boolean;
  recoverable: boolean;
} | null;
export function mergeContextWall(
  current: ContextWallSignal | null | undefined,
  next: ContextWallSignal | null | undefined,
): ContextWallSignal | null;
export function contextWallFromStreamEvent(event: object | null | undefined): ContextWallSignal | null;
export function answerIsOnlyPipelineFail(text: string): boolean;
export function contextWallSummary(signal: ContextWallSignal): string;
