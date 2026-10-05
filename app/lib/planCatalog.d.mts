export const USD_REFERENCE: Record<'free' | 'premium' | 'premium_plus', number>;
export const PLAN_NAMES: Record<'free' | 'premium' | 'premium_plus', string>;
export const PLAN_FEATURES: Record<'free' | 'premium' | 'premium_plus', string[]>;
export const PLAN_TAGLINES: Record<'free' | 'premium' | 'premium_plus', string>;
export function priceLabel(row: { currency?: string; amount?: number | string | null; amount_display?: string } | undefined | null, usdFallback: number): string;
export function priceNote(row: { currency?: string; amount?: number | string | null } | undefined | null, usdFallback: number): string;
