export function digestStatusLine(s: { enabled: boolean; next_run_at: string | null; last_status: string | null } | null | undefined): string;
export function deliveryLine(d: { email?: string; slack?: string } | null | undefined): string;
export function runNowMessage(res: { status?: string } | null | undefined, err?: { status?: number; message?: string } | null): string;
