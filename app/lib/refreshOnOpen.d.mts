export const LIVE_QUERY_TYPES: string[];
export const MAX_PER_OPEN: number;
export const MIN_AGE_MS: number;
export function staleLiveWidgets(widgets: Array<Record<string, any>> | null | undefined, now: number, minAgeMs?: number, max?: number): string[];
