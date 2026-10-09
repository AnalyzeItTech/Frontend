// Words for the team panel and the invitation page. Pure, so what they promise can be tested against what the server enforces.

export const VIEWER_CAN = ['See the project, its charts, objects and records', 'Open the weekly digests'];
export const VIEWER_CANNOT = ['Change or delete anything', 'Ask the assistant about the project', 'Add files or connect accounts'];

export function memberLine(m) {
  if (!m) return '';
  return m.status === 'active' ? `${m.email}, can view` : `${m.email}, invited (waiting for them to accept)`;
}

export function inviteErrorMessage(err) {
  const m = err && typeof err.message === 'string' ? err.message : '';
  if (err?.status === 404) return 'Only the owner of a project can invite people to it.';
  return m || 'Could not send the invitation.';
}

export function acceptErrorMessage(err) {
  if (err?.status === 403) return 'This invitation was sent to a different e-mail address. Sign in with the address it was sent to.';
  if (err?.status === 404) return 'This invitation is not valid any more. Ask for a new one.';
  return typeof err?.message === 'string' && err.message ? err.message : 'Could not accept the invitation.';
}

/** Where to send someone who is not signed in: sign in, then come straight back to the invitation. Only our own invitation paths. */
export function loginPathFor(token) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(token || '') ? `/login?next=${encodeURIComponent(`/invite/${token}`)}` : '/login';
}
