export const LOADER_DURATION_MS: number;
export const LOADER_MAX_MS: number;
export const LOADER_SKIP_AFTER_MS: number;
export function loaderProgress(elapsedMs: number): number;
export function loaderStatus(progress: number): string;
export function loaderExpired(elapsedMs: number): boolean;
export function skipVisible(elapsedMs: number): boolean;
