export const TRYOUT_EXAMPLES: Array<{ label: string; question: string }>;
export function formatWait(seconds: number): string;
export function runsLabel(remaining: number, limit: number): string;
export function explainTryoutFailure(status: number, detail: any): { kind: 'limit' | 'busy' | 'full' | 'input' | 'unavailable' | 'error'; message: string; retryAfter?: number };
