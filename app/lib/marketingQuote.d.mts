export function loadMarketingQuote(): Promise<{
  country?: string | null;
  plans?: Partial<
    Record<
      'premium' | 'premium_plus',
      { currency?: string; amount?: number | string | null; amount_usd?: number; amount_display?: string }
    >
  >;
} | null>;
