export const LOADER_DURATION_MS: number;
export const LOADER_MAX_MS: number;
export const LOADER_SKIP_AFTER_MS: number;
export const LOADER_STALL_MS: number;
export function loaderProgress(elapsedMs: number): number;
export function loaderStatus(progress: number): string;
export function loaderExpired(elapsedMs: number): boolean;
export function skipVisible(elapsedMs: number): boolean;
export function loaderShouldDismiss(state?: {
  elapsedMs?: number;
  progress?: number | null;
  reducedMotion?: boolean;
  sceneReady?: boolean;
  positiveProgressSeen?: boolean;
}): boolean;
export function hashId(hash: string): string;
export const LANDING_NAV_OFFSET_PX: number;
export function landingHashScrollTop(absoluteTop: number, offsetPx?: number): number;
export function loaderBootScript(): string;
