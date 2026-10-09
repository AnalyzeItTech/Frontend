/**
 * Connector list and Google Drive connect/sync states.
 *
 * GET /v1/connectors/available is the source of what can be offered.
 * A connector is connectable only when that payload says it is configured.
 * `status: "not_configured"` (Drive app env missing) stays unavailable.
 * Live Backend A (069004b) reports a ready Drive row as `status: "available"`
 * plus `oauth_configured: true`. `configured` is the same ready state.
 *
 * POST /v1/connectors/{id}/sync returns the sync-run document itself:
 * status is `completed` or `failed` (HTTP 200 either way). Ingest outcome is
 * `ingest_status`, not a top-level `skipped`.
 */

const READY_STATUSES = new Set(['configured', 'available', 'ready']);
const UNAVAILABLE_STATUSES = new Set(['not_configured', 'unconfigured', 'unavailable']);

const INGEST_STATUSES = new Set(['written', 'partial', 'unchanged', 'failed', 'blocked', 'skipped']);

const COUNT_FIELDS = [
  ['files_seen', 'Files seen'],
  ['files_written', 'Files written'],
  ['files_replaced', 'Files replaced'],
];

const CALLBACK_ERROR_KEYS = ['error_description', 'connector_error', 'oauth_error', 'connected_error', 'error'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function skippedCountLabel(key) {
  if (key === 'files_skipped') return 'Files skipped';
  const suffix = key.slice('files_skipped_'.length).replace(/[_-]+/g, ' ');
  return suffix ? `Files skipped · ${suffix}` : 'Files skipped';
}

/** Plain label for the two data modes the sync-run document sends. */
export function dataModeLabel(mode) {
  if (mode === 'live_readonly') return 'Live read-only';
  if (mode === 'preview') return 'Preview';
  return null;
}

function claimsMemory(value) {
  return /analy[sz]ed|added to memory|into memory|in your memory|saved to memory/i.test(value || '');
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

/**
 * Authorize 200 is only {auth_url, state}. Open auth_url.
 * redirect_uri is ignored by the server and is not sent.
 */
export function oauthRedirectUrl(body) {
  if (!body || typeof body !== 'object') return null;
  const value = body.auth_url;
  if (typeof value === 'string' && /^https:\/\//i.test(value.trim())) return value.trim();
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

function emptySyncResult() {
  return {
    phase: 'unknown',
    ingestStatus: null,
    ingestSkippedReason: null,
    counts: [],
    truncated: false,
    dataMode: null,
    note: null,
    headline: null,
    toast: null,
    errors: [],
  };
}

function ingestHeadline(phase, ingestStatus, reason) {
  if (phase === 'failed') return 'The Drive listing failed. Nothing was added to memory.';
  if (reason === 'ingest_paused') {
    return 'Ingestion is paused. Nothing was added to memory.';
  }
  if (ingestStatus === 'skipped' && reason === 'retention_flags_off') {
    return "Files were listed, but nothing was added to memory yet because ingestion isn't enabled for this account.";
  }
  if (ingestStatus === 'written') return 'Listed files were added to memory.';
  if (ingestStatus === 'partial') return 'Some listed files were added to memory. The rest were not.';
  if (ingestStatus === 'blocked') return 'Ingestion is blocked. Nothing was added to memory.';
  if (ingestStatus === 'unchanged') return 'Nothing new was added to memory.';
  if (ingestStatus === 'failed') return 'Ingestion failed. Nothing was added to memory.';
  if (ingestStatus === 'skipped') return 'Files were listed. Nothing was added to memory.';
  if (phase === 'completed') return 'Sync completed.';
  return null;
}

function syncCounts(body) {
  const counts = [];
  for (const [key, label] of COUNT_FIELDS) {
    const value = finiteNumber(body[key]);
    if (value != null) counts.push({ key, label, value });
  }
  const objects = body.objects_synced;
  if (objects && typeof objects === 'object' && !Array.isArray(objects)) {
    const files = finiteNumber(objects.file);
    if (files != null) counts.push({ key: 'objects_synced.file', label: 'Files synced', value: files });
  }
  const skippedKeys = Object.keys(body)
    .filter((key) => key === 'files_skipped' || key.startsWith('files_skipped_'))
    .sort();
  for (const key of skippedKeys) {
    const value = finiteNumber(body[key]);
    if (value != null) counts.push({ key, label: skippedCountLabel(key), value });
  }
  return counts;
}

function syncErrors(body) {
  if (!Array.isArray(body.errors)) return [];
  const errors = [];
  for (const item of body.errors) {
    let message = '';
    if (typeof item === 'string') message = text(item);
    else if (item && typeof item === 'object') message = text(item.message || item.detail || item.error);
    if (!message) continue;
    errors.push(message.slice(0, 180));
    if (errors.length >= 3) break;
  }
  return errors;
}

/**
 * Sync-run document from POST /v1/connectors/{id}/sync.
 * Counts are only files_seen, files_written, files_replaced, objects_synced.file,
 * and files_skipped_* . A counts/stats wrapper is ignored.
 * phase: 'completed' | 'failed' | 'unknown'
 */
export function readSyncResult(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return emptySyncResult();

  const status = text(body.status).toLowerCase();
  const phase = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'unknown';
  const ingestRaw = text(body.ingest_status).toLowerCase();
  const ingestStatus = INGEST_STATUSES.has(ingestRaw) ? ingestRaw : null;
  const reasonRaw = body.ingest_skipped_reason;
  const ingestSkippedReason = reasonRaw == null || text(reasonRaw) === '' ? null : text(reasonRaw);
  const dataMode = body.data_mode === 'live_readonly' || body.data_mode === 'preview' ? body.data_mode : null;
  const rawNote = text(body.note);
  const memoryAllowed = ingestStatus === 'written' || ingestStatus === 'partial';
  const note = rawNote && (memoryAllowed || !claimsMemory(rawNote)) ? rawNote : null;
  const headline = ingestHeadline(phase, ingestStatus, ingestSkippedReason);

  return {
    phase,
    ingestStatus,
    ingestSkippedReason,
    counts: syncCounts(body),
    truncated: body.truncated === true,
    dataMode,
    note,
    headline,
    toast: note || headline,
    errors: syncErrors(body),
  };
}

/** HTTP failure while syncing. "Already in progress" is not a failed sync. */
export function syncFailurePhase(message) {
  const value = text(message);
  if (/in progress|already syncing|sync already|still running|still syncing/i.test(value)) return 'in_progress';
  return 'failed';
}

/** Card state when the sync request itself failed (not an HTTP 200 sync-run). */
export function syncFailureView(message) {
  const phase = syncFailurePhase(message);
  const headline = phase === 'in_progress'
    ? (text(message) || 'Sync is still running.')
    : (text(message) || 'Sync failed. Nothing was added to memory.');
  return {
    phase,
    ingestStatus: null,
    ingestSkippedReason: null,
    counts: [],
    truncated: false,
    dataMode: null,
    note: null,
    headline,
    toast: headline,
    errors: [],
  };
}

/** Active project connector for a provider, ignoring rows the server marked disconnected. */
export function connectionForProvider(connectors, providerId) {
  if (!Array.isArray(connectors) || !providerId) return null;
  const rows = connectors.filter((row) => row && row.provider === providerId && row.id && row.status !== 'disconnected');
  return rows.find((row) => row.status === 'connected' || row.status === 'healthy') || rows[0] || null;
}
