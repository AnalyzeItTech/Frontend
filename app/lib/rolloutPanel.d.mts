export interface FlagRule {
  enabled?: boolean;
  tiers?: string[];
  percent?: number | null;
  allow_users?: string[];
  deny_users?: string[];
}
export function allowAccountBody(rule: FlagRule | undefined, userId: string): Required<Pick<FlagRule, 'enabled' | 'tiers' | 'allow_users' | 'deny_users'>> & { percent?: number };
export function removeAccountBody(rule: FlagRule | undefined, userId: string): Required<Pick<FlagRule, 'enabled' | 'tiers' | 'allow_users' | 'deny_users'>> & { percent?: number };
export function statusLook(status: string): { mark: string; cls: string; label: string };
export function validAccountId(value: unknown): boolean;
