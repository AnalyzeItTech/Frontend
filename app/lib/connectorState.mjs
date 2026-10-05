/**
 * Connector list and Google Drive connect/sync states.
 *
 * GET /v1/connectors/available is the source of what can be offered.
 * A connector is connectable only when that payload says it is configured.
 * `status: "not_configured"` (Drive app env missing) stays unavailable.
 * Live Backend A (version 71bc330efbe6) reports a ready Drive row as
 * `status: "available"` plus `oauth_configured: true`. `configured` is accepted
 * as the same ready state in case PR #49's branch uses that word.
 */

const READY_STATUSES = new Set(['configured', 'available', 'ready']);
const UNAVAILABLE_STATUSES = new Set(['not_configured', 'unconfigured', 'unavailable']);

const IN_PROGRESS = new Set(['in_progress', 'running', 'pending', 'started', 'syncing', 'queued']);
const FAILED = new Set(['failed', 'error', 'failure']);
const SUCCEEDED = new Set(['succeeded', 'success', 'completed', 'complete', 'ok', 'done']);

const COUNT_LABELS = {
  files: 'Files',
  files_synced: 'Files synced',
  file_count: 'Files',
  synced: 'Synced',
  created: 'Created',
  updated: 'Updated',
  skipped: 'Skipped',
  failed: 'Failed',
  errors: 'Errors',
  docs: 'Docs',
  documents: 'Documents',
  sheets: 'Sheets',
  slides: 'Slides',
  records: 'Records',
  imported: 'Imported',
  unchanged: 'Unchanged',
  folders: 'Folders',
  exported: 'Exported',
};

const CALLBACK_ERROR_KEYS = ['error_description', 'connector_error', 'oauth_error', 'connected_error', 'error'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function labelFor(key) {
  if (COUNT_LABELS[key]) return COUNT_LABELS[key];
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function unavailableReason(entry) {
  const explicit = text(entry?.unavailable_reason) || text(entry?.reason) || text(entry?.coming_soon_reason);
  if (explicit) return explicit;
  const id = text(entry?.id);
  const name = text(entry?.name) || id || 'This connector';
  if (id === 'google_drive') {
    return 'Google Drive is not available on this server. The Drive app credentials are not configured, so there is nothing to connect.';
  }
  return `${name} is not available on this server. It is listed, but it is not configured, so there is no Connect action.`;
}

function allowsConnection(entry) {
  return entry?.supports_connection === true || entry?.auth_mode === 'connection' || entry?.auth_mode === 'catalog';
}

function allowsOAuth(entry) {
  if (entry?.oauth_configured === false && entry?.supports_oauth !== true && entry?.auth_mode !== 'oauth') return false;
  if (entry?.auth_mode === 'oauth' || entry?.supports_oauth === true) return entry?.oauth_configured !== false;
  return entry?.oauth_configured === true;
}

/**
 * Map one /v1/connectors/available row to a card state.
 * kind: 'ready' | 'unavailable' | 'coming_soon'
 * A ready card may offer oauth, a connection form, or both. Neither means no Connect button.
 */
export function connectorSetupState(entry) {
  if (!entry || typeof entry !== 'object' || !text(entry.id)) {
    return {
      kind: 'unavailable',
      oauth: false,
      connection: false,
      reason: 'This connector was not returned by the server.',
    };
  }

  const status = text(entry.status).toLowerCase();
  if (UNAVAILABLE_STATUSES.has(status)) {
    return { kind: 'unavailable', oauth: false, connection: false, reason: unavailableReason(entry) };
  }

  if (READY_STATUSES.has(status)) {
    const connection = allowsConnection(entry);
    let oauth = allowsOAuth(entry);
    if (!oauth && !connection && entry.oauth_configured !== false && entry.auth_mode !== 'connection' && entry.auth_mode !== 'catalog') {
      oauth = true;
    }
    if (!oauth && !connection) {
      return { kind: 'unavailable', oauth: false, connection: false, reason: unavailableReason(entry) };
    }
    return { kind: 'ready', oauth, connection, reason: '' };
  }

  const oauthOnlyOff = (entry.auth_mode === 'oauth' || entry.supports_oauth === true)
    && entry.oauth_configured === false
    && !allowsConnection(entry);
  if (oauthOnlyOff) {
    return { kind: 'unavailable', oauth: false, connection: false, reason: unavailableReason(entry) };
  }

  if (entry.coming_soon === true) {
    return {
      kind: 'coming_soon',
      oauth: false,
      connection: false,
      reason: text(entry.coming_soon_reason) || 'Coming soon',
    };
  }

  const connection = allowsConnection(entry);
  const oauth = entry.oauth_configured === true;
  if (oauth || connection) {
    return { kind: 'ready', oauth, connection, reason: '' };
  }

  return { kind: 'unavailable', oauth: false, connection: false, reason: unavailableReason(entry) };
}

/** Ids actually returned by /available, in order, with duplicates and blanks dropped. */
export function availableConnectorIds(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const ids = [];
  for (const row of rows) {
    const id = text(row?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function providerLabel(id) {
  const clean = text(id);
  if (!clean) return 'Connector';
  if (clean === 'google_drive') return 'Google Drive';
  if (clean === 'github') return 'GitHub';
  if (clean === 'openml') return 'OpenML';
  return clean.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Body for POST /v1/connectors/google_drive/authorize. project_id only — no secrets, no redirect. */
export function googleDriveAuthorizeBody(projectId) {
  const id = text(projectId);
  if (!id) {
    throw new Error('A project is required before connecting Google Drive.');
  }
  return { project_id: id };
}

/** HTTPS OAuth URL from an authorize response. Anything else is a failure, not a redirect. */
export function oauthRedirectUrl(body) {
  if (!body || typeof body !== 'object') return null;
  for (const key of ['auth_url', 'authorization_url', 'oauth_url', 'url', 'redirect_url']) {
    const value = body[key];
    if (typeof value === 'string' && /^https:\/\//i.test(value.trim())) return value.trim();
  }
  return null;
}

function paramValue(source, key) {
  if (!source) return '';
  if (typeof source.get === 'function') return text(source.get(key));
  const value = source[key];
  if (Array.isArray(value)) return text(value[0]);
  return text(value);
}

function callbackMessage(raw) {
  const value = text(raw).replace(/\s+/g, ' ').slice(0, 240);
  if (!value) return 'Google Drive didn’t connect. Nothing was saved. Start again from Connect.';
  if (/access_denied|denied|cancel/i.test(value)) {
    return 'Google Drive access was denied. Nothing was connected.';
  }
  if (/expired|invalid|csrf|state/i.test(value)) {
    return 'That connection link expired. Start again from Connect.';
  }
  if (/secret|token|code=|bearer /i.test(value) || /[A-Za-z0-9_-]{40,}/.test(value)) {
    return 'Google Drive didn’t connect. Start again from Connect.';
  }
  return value;
}

/**
 * OAuth return on /connectors.
 * Success is only `connected=<provider>` with no error.
 * kind: 'success' | 'error' | 'none'
 */
export function readConnectorCallback(source) {
  const connected = paramValue(source, 'connected');
  let errorRaw = '';
  for (const key of CALLBACK_ERROR_KEYS) {
    errorRaw = paramValue(source, key);
    if (errorRaw) break;
  }
  const status = paramValue(source, 'status').toLowerCase();
  const failedStatus = status === 'error' || status === 'failed';
  if (errorRaw || failedStatus) {
    return {
      kind: 'error',
      provider: connected || null,
      message: callbackMessage(errorRaw || status),
    };
  }
  if (paramValue(source, 'code') && !connected) {
    return {
      kind: 'error',
      provider: null,
      message: 'The connection didn’t finish on this page. Start again from Connect.',
    };
  }
  if (connected) {
    return { kind: 'success', provider: connected, message: `${providerLabel(connected)} is connected.` };
  }
  return { kind: 'none', provider: null, message: '' };
}

function countBag(body) {
  if (!body || typeof body !== 'object') return null;
  for (const key of ['counts', 'stats', 'sync_counts']) {
    const value = body[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  if (body.result && typeof body.result === 'object') {
    for (const key of ['counts', 'stats', 'sync_counts']) {
      const value = body.result[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    }
  }
  return null;
}

function pushCount(out, seen, key, value) {
  if (seen.has(key)) return;
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  seen.add(key);
  out.push({ key, label: labelFor(key), value });
}

/**
 * Sync POST body → phase + the numeric counts the server actually returned.
 * Missing counts stay missing. Zero is shown only when the server sent zero.
 * phase: 'in_progress' | 'failed' | 'succeeded' | 'skipped' | 'unknown'
 */
export function readSyncResult(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { phase: 'unknown', counts: [], message: null };
  }
  const status = text(body.status || body.sync_status || body.state).toLowerCase();
  let phase = 'unknown';
  if (IN_PROGRESS.has(status) || body.in_progress === true) phase = 'in_progress';
  else if (FAILED.has(status) || body.ok === false) phase = 'failed';
  else if (status === 'skipped') phase = 'skipped';
  else if (SUCCEEDED.has(status) || body.ok === true) phase = 'succeeded';

  const counts = [];
  const seen = new Set();
  const bag = countBag(body);
  if (bag) {
    for (const [key, value] of Object.entries(bag)) pushCount(counts, seen, key, value);
  }
  for (const key of Object.keys(COUNT_LABELS)) pushCount(counts, seen, key, body[key]);

  const message = text(body.note) || text(body.message) || text(body.error) || (typeof body.detail === 'string' ? text(body.detail) : '') || null;
  return { phase, counts, message };
}

/** HTTP failure while syncing. "Already in progress" is not a failed sync. */
export function syncFailurePhase(message) {
  const value = text(message);
  if (/in progress|already syncing|sync already|still running|still syncing/i.test(value)) return 'in_progress';
  return 'failed';
}

/** Active project connector for a provider, ignoring rows the server marked disconnected. */
export function connectionForProvider(connectors, providerId) {
  if (!Array.isArray(connectors) || !providerId) return null;
  const rows = connectors.filter((row) => row && row.provider === providerId && row.id && row.status !== 'disconnected');
  return rows.find((row) => row.status === 'connected' || row.status === 'healthy') || rows[0] || null;
}
