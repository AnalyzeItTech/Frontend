export const DEMO_EXAMPLES: Array<{ label: string; question: string }>;
export function toolLabel(name: string): string;
export function zeroTokenToolFromRoute(route: unknown): string | null;
export interface DemoResult {
  answer: string;
  zeroTool: string | null;
  sources: Array<{ host: string; url: string; title: string; verified: boolean }>;
  error: { code: string | null; message: string } | null;
  failedTool: string | null;
}
export function parseDemoStream(events: Array<{ event?: string; payload?: Record<string, any> }>): DemoResult;
export function explainDemoFailure(status: number, detail: any): { kind: 'limit' | 'needs_account' | 'unavailable' | 'error'; message: string };
export function triesLabel(remaining: number, limit: number): string;
