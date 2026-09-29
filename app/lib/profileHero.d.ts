export function profilePeriodLabel(period?: string | null): string | null;

export function profileTierName(raw?: string | null): string;

export function profileInitials(name?: string | null, email?: string | null): string;

export type ProfileQuotaInput = {
  unit?: string;
  used?: number;
  limit?: number | null;
  remaining?: number | null;
  unlimited?: boolean;
  nearCap?: boolean;
  exhausted?: boolean;
  period?: string;
} | null;

export type ProfileMonthUsage = {
  available: boolean;
  used: number | null;
  ceiling: number | null;
  unlimited: boolean;
  nearCap: boolean;
  exhausted: boolean;
  showUpgrade: boolean;
  remaining: number | null;
  percent: number;
  periodLabel: string | null;
  summary: string;
  detail: string;
  footnote: string;
};

export function profileMonthUsage(
  quota: ProfileQuotaInput,
  tier?: string | null,
): ProfileMonthUsage;
