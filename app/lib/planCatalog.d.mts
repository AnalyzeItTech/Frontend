export const USD_REFERENCE: Record<'free' | 'premium' | 'premium_plus', number>;
export const PLAN_NAMES: Record<'free' | 'premium' | 'premium_plus', string>;
export const PLAN_FEATURES: Record<'free' | 'premium' | 'premium_plus', string[]>;
export const PLAN_TAGLINES: Record<'free' | 'premium' | 'premium_plus', string>;
export function priceLabel(row: { currency?: string; amount?: number | string | null; amount_display?: string } | undefined | null, usdFallback: number): string;
export const ANNUAL_MONTHS: number;
export function priceNote(row: { currency?: string; amount?: number | string | null; recurring?: boolean } | undefined | null, usdFallback: number, annual?: boolean): string;

export type MarketingQuote = {
  annual_plans?: Partial<
    Record<
      'premium' | 'premium_plus',
      { currency?: string; amount?: number | string | null; amount_usd?: number; amount_display?: string; recurring?: boolean }
    >
  >;
  plans?: Partial<
    Record<
      'premium' | 'premium_plus',
      { currency?: string; amount?: number | string | null; amount_usd?: number; amount_display?: string}
    >
  >;
} | null | undefined;

export type PresentedPlan = {
  id: 'free' | 'premium' | 'premium_plus';
  name: string;
  tagline: string;
  features: string[];
  price: string;
  note: string;
  period: string;
};

export function presentPlans(quote: MarketingQuote, interval?: 'monthly' | 'annual'): PresentedPlan[];
