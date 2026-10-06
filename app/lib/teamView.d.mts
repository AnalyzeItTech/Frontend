export const VIEWER_CAN: string[];
export const VIEWER_CANNOT: string[];
export function memberLine(m: { email: string; status: string } | null | undefined): string;
export function inviteErrorMessage(err: { status?: number; message?: string } | null | undefined): string;
export function acceptErrorMessage(err: { status?: number; message?: string } | null | undefined): string;
export function loginPathFor(token: string): string;
