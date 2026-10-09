// Words for the weekly digest panel. Pure, so what the panel says about its own state can be tested.

const STATUS = {
  ok: 'The last digest was made.',
  needs_ai_access: 'The last check was skipped because the assistant is not allowed to read this project’s data. Allow it under AI data access, above.',
  no_data: 'The last check found no data to analyse yet. Connect or upload data, then it will run.',
  failed: 'The last check could not be completed. It will try again.',
};

export function digestStatusLine(s) {
  if (!s) return '';
  if (!s.enabled) return 'Off. Turn it on to get a check of this project’s data every week.';
  const next = s.next_run_at ? new Date(s.next_run_at) : null;
  const when = next && !Number.isNaN(+next) ? (next.getTime() <= Date.now() ? 'is due now' : `is next on ${next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`) : '';
  const base = s.last_status && STATUS[s.last_status] ? STATUS[s.last_status] : 'On.';
  return when ? `${base} The next check ${when}.` : base;
}

export function deliveryLine(d) {
  const parts = [];
  if (d?.email) parts.push('email queued');
  if (d?.slack) parts.push('Slack queued');
  return parts.length ? parts.join(', ') : 'in the app only';
}

/** What to say when making one now was refused or failed. */
export function runNowMessage(res, err) {
  if (err) {
    if (err.status === 429) return 'A digest was made less than an hour ago. Open it below.';
    return typeof err.message === 'string' && err.message ? err.message : 'Could not make a digest.';
  }
  if (res?.status === 'ok') return 'Made a new digest.';
  if (res?.status === 'needs_ai_access') return 'Allow the assistant to read this project’s data first (AI data access, above).';
  if (res?.status === 'no_data') return 'There is no data to analyse yet.';
  return 'The check could not be completed. Try again in a moment.';
}
