// Turn an agent's proposed data change into something a person can review: a headline plus a before/after table.
// Pure (no React) so it is unit-tested with `node --test`.

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function formatValue(v, max = 80) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @param {{action?:string, api_name?:string, record_id?:string, data?:Record<string,unknown>, before?:Record<string,unknown>|null, base_version?:number}} p
 */
export function describeChange(p) {
  const proposal = p || {};
  const action = ['create', 'update', 'delete'].includes(proposal.action) ? proposal.action : 'unknown';
  const object = proposal.api_name || 'record';
  const before = proposal.before && typeof proposal.before === 'object' ? proposal.before : null;
  const data = proposal.data && typeof proposal.data === 'object' ? proposal.data : {};
  const notes = [];
  let rows = [];
  let headline = 'Unrecognised change';

  if (action === 'create') {
    headline = `Create a new ${object} record`;
    rows = Object.keys(data).map((field) => ({ field, before: undefined, after: data[field], changed: true }));
  } else if (action === 'update') {
    headline = `Update ${object} record ${proposal.record_id || ''}`.trim();
    rows = Object.keys(data).map((field) => ({
      field,
      before: before ? before[field] : undefined,
      after: data[field],
      changed: before ? !same(before[field], data[field]) : true,
    }));
    if (!before) notes.push('Current values could not be shown, so the table lists only the new values.');
    if (before && rows.length && rows.every((r) => !r.changed)) notes.push('These values already match the current record: approving changes nothing.');
  } else if (action === 'delete') {
    headline = `Move ${object} record ${proposal.record_id || ''} to the trash`.trim();
    rows = before ? Object.keys(before).map((field) => ({ field, before: before[field], after: undefined, changed: true })) : [];
    notes.push('Deleted records stay in the trash for 30 days and can be restored from the Objects page.');
    if (!before) notes.push('Current values could not be shown.');
  } else {
    notes.push('This change type is not supported and cannot be approved.');
  }
  return {
    action,
    object,
    recordId: proposal.record_id || null,
    headline,
    rows,
    notes,
    canApprove: action !== 'unknown' && (action === 'delete' || rows.length > 0),
    changedCount: rows.filter((r) => r.changed).length,
  };
}

/** Plain-language outcome for a failed approval (the API returns 409 when the record changed since the proposal). */
export function explainApplyError(status, message) {
  if (status === 409) return 'Someone changed this record after the assistant proposed the edit. Ask the assistant again to get a fresh proposal.';
  if (status === 401) return 'Your session has expired. Sign in again to approve.';
  if (status === 403 || status === 404) return 'You are not allowed to change this project, or the proposal no longer exists.';
  return message || 'The change could not be applied.';
}
