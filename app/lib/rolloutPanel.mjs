// Helpers for the ops "Memory rollout" panel.

/**
 * Request body that adds one account to a flag's allow-list without touching who else it applies to.
 * A flag that is off stays off for everyone except the named accounts: that is how one account is tried first.
 * @param {{ enabled?: boolean, tiers?: string[], percent?: number | null, allow_users?: string[], deny_users?: string[] } | undefined} rule
 * @param {string} userId
 */
export function allowAccountBody(rule, userId) {
  const id = String(userId || '').trim();
  const body = {
    enabled: Boolean(rule?.enabled),
    tiers: Array.isArray(rule?.tiers) ? rule.tiers : [],
    allow_users: Array.isArray(rule?.allow_users) ? [...rule.allow_users] : [],
    deny_users: Array.isArray(rule?.deny_users) ? rule.deny_users : [],
  };
  if (rule?.percent != null) body.percent = rule.percent;
  if (id && !body.allow_users.includes(id)) body.allow_users.push(id);
  return body;
}

/** Same rule with one account taken off the allow-list. */
export function removeAccountBody(rule, userId) {
  const body = allowAccountBody(rule, '');
  body.allow_users = body.allow_users.filter((u) => u !== String(userId || '').trim());
  return body;
}

/** Look of a checklist row. */
export function statusLook(status) {
  if (status === 'ok') return { mark: '✓', cls: 'text-emerald-700', label: 'ready' };
  if (status === 'todo') return { mark: '✕', cls: 'text-red-700', label: 'needs action' };
  return { mark: '!', cls: 'text-amber-700', label: 'check' };
}

/** A user id is safe to send as an allow-list entry: non-empty, short, no whitespace. */
export function validAccountId(value) {
  const v = String(value || '').trim();
  return v.length > 0 && v.length <= 80 && !/\s/.test(v);
}
