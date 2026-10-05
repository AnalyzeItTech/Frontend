/**
 * Google Drive and connector card state mapping.
 * Run: node --test app/lib/connectorState.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  availableConnectorIds,
  connectionForProvider,
  connectorSetupState,
  dataModeLabel,
  googleDriveAuthorizeBody,
  oauthRedirectUrl,
  readConnectorCallback,
  readSyncResult,
  syncFailurePhase,
  syncFailureView,
} from './connectorState.mjs';

const LIVE_DRIVE = {
  id: 'google_drive',
  name: 'Google Drive',
  description: 'Read-only sync of Drive files into project memory.',
  auth_mode: 'oauth',
  supports_connection: false,
  supports_oauth: true,
  oauth_configured: true,
  coming_soon: false,
  status: 'available',
};

test('google_drive not_configured is unavailable and has no Connect action', () => {
  const state = connectorSetupState({
    ...LIVE_DRIVE,
    status: 'not_configured',
    oauth_configured: false,
  });
  assert.equal(state.kind, 'unavailable');
  assert.equal(state.oauth, false);
  assert.equal(state.connection, false);
  assert.match(state.reason, /not configured/i);
  assert.doesNotMatch(state.reason, /connect button/i);
});

test('live available + oauth_configured Drive row is ready for OAuth only', () => {
  const state = connectorSetupState(LIVE_DRIVE);
  assert.equal(state.kind, 'ready');
  assert.equal(state.oauth, true);
  assert.equal(state.connection, false);
});

test('status configured is the same ready state', () => {
  const state = connectorSetupState({ ...LIVE_DRIVE, status: 'configured' });
  assert.equal(state.kind, 'ready');
  assert.equal(state.oauth, true);
});

test('oauth-only Drive without a status and oauth_configured false is unavailable', () => {
  const rest = { ...LIVE_DRIVE, oauth_configured: false };
  delete rest.status;
  const state = connectorSetupState(rest);
  assert.equal(state.kind, 'unavailable');
  assert.equal(state.oauth, false);
});

test('not_configured wins over a stale oauth_configured flag', () => {
  const state = connectorSetupState({ ...LIVE_DRIVE, status: 'not_configured', oauth_configured: true });
  assert.equal(state.kind, 'unavailable');
  assert.equal(state.oauth, false);
});

test('Stripe with oauth off still offers the connection form and not OAuth', () => {
  const state = connectorSetupState({
    id: 'stripe',
    name: 'Stripe Connect',
    auth_mode: 'connection',
    supports_connection: true,
    supports_oauth: true,
    oauth_configured: false,
    coming_soon: false,
  });
  assert.equal(state.kind, 'ready');
  assert.equal(state.oauth, false);
  assert.equal(state.connection, true);
});

test('GitHub is connectable only when the server says oauth is configured', () => {
  assert.equal(connectorSetupState({
    id: 'github',
    auth_mode: 'oauth',
    supports_oauth: true,
    supports_connection: false,
    oauth_configured: true,
  }).oauth, true);
  const off = connectorSetupState({
    id: 'github',
    auth_mode: 'oauth',
    supports_oauth: true,
    supports_connection: false,
    oauth_configured: false,
  });
  assert.equal(off.kind, 'unavailable');
  assert.equal(off.oauth, false);
});

test('Notion and Slack are absent unless /available returns them', () => {
  const ids = availableConnectorIds([
    LIVE_DRIVE,
    { id: 'github', oauth_configured: true },
    { id: '' },
    { id: 'google_drive' },
    null,
  ]);
  assert.deepEqual(ids, ['google_drive', 'github']);
  assert.equal(ids.includes('notion'), false);
  assert.equal(ids.includes('slack'), false);
  assert.deepEqual(availableConnectorIds([]), []);
  assert.deepEqual(availableConnectorIds(null), []);
});

test('a returned Notion row is shown only with the state the server sent', () => {
  const state = connectorSetupState({ id: 'notion', status: 'not_configured', auth_mode: 'oauth', oauth_configured: false });
  assert.equal(state.kind, 'unavailable');
  assert.equal(state.oauth, false);
});

test('authorize body is project_id only', () => {
  assert.deepEqual(googleDriveAuthorizeBody(' proj_1 '), { project_id: 'proj_1' });
  assert.throws(() => googleDriveAuthorizeBody(''), /project is required/i);
});

test('authorize 200 opens only auth_url', () => {
  const body = { auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc', state: 'abc' };
  assert.equal(oauthRedirectUrl(body), 'https://accounts.google.com/o/oauth2/v2/auth?state=abc');
  assert.equal(oauthRedirectUrl({ url: 'https://accounts.google.com/o/oauth2/v2/auth', state: 'abc' }), null);
  assert.equal(oauthRedirectUrl({ auth_url: 'http://accounts.google.com/o/oauth2/v2/auth', state: 'abc' }), null);
  assert.equal(oauthRedirectUrl({ auth_url: 'javascript:alert(1)', state: 'abc' }), null);
  assert.equal(oauthRedirectUrl({ state: 'abc' }), null);
  assert.equal(oauthRedirectUrl(null), null);
});

test('callback connected=google_drive is success', () => {
  const params = new URLSearchParams('connected=google_drive&project=p1');
  const result = readConnectorCallback(params);
  assert.equal(result.kind, 'success');
  assert.equal(result.provider, 'google_drive');
  assert.match(result.message, /Google Drive is connected/);
});

test('callback errors are not a success and do not echo secrets', () => {
  const denied = readConnectorCallback(new URLSearchParams('connected=google_drive&error=access_denied'));
  assert.equal(denied.kind, 'error');
  assert.match(denied.message, /denied/i);

  const leaked = readConnectorCallback({
    error_description: 'token ya29.supersecretvalue_that_should_not_render_in_the_ui_at_all',
  });
  assert.equal(leaked.kind, 'error');
  assert.doesNotMatch(leaked.message, /ya29/);

  const failed = readConnectorCallback(new URLSearchParams('connected=google_drive&status=failed'));
  assert.equal(failed.kind, 'error');

  assert.equal(readConnectorCallback(new URLSearchParams('project=p1')).kind, 'none');
});

test('a bare OAuth code on /connectors is an error, not a success', () => {
  const result = readConnectorCallback(new URLSearchParams('code=4/0Asecret&state=abc'));
  assert.equal(result.kind, 'error');
  assert.doesNotMatch(result.message, /4\/0A/);
});

const DRIVE_RUN = {
  status: 'completed',
  objects_synced: { file: 4 },
  files_seen: 12,
  files_written: 4,
  files_replaced: 1,
  files_skipped_binary: 2,
  files_skipped_too_large: 0,
  truncated: true,
  ingest_status: 'written',
  ingest_skipped_reason: null,
  note: 'Drive listing finished.',
  data_mode: 'live_readonly',
  errors: [],
};

test('a completed sync-run uses only the Drive count fields', () => {
  const result = readSyncResult({
    ...DRIVE_RUN,
    counts: { files: 99, docs: 3 },
    stats: { slides: 8 },
    files_synced: 7,
    updated: 6,
  });
  assert.equal(result.phase, 'completed');
  assert.equal(result.ingestStatus, 'written');
  assert.equal(result.dataMode, 'live_readonly');
  assert.equal(result.truncated, true);
  assert.equal(result.toast, 'Drive listing finished.');
  assert.match(result.headline, /added to memory/);
  assert.deepEqual(result.counts.map((count) => [count.key, count.value]), [
    ['files_seen', 12],
    ['files_written', 4],
    ['files_replaced', 1],
    ['objects_synced.file', 4],
    ['files_skipped_binary', 2],
    ['files_skipped_too_large', 0],
  ]);
});

test('there is no top-level skipped status; ingest_status carries that', () => {
  const result = readSyncResult({ status: 'skipped', note: 'not a real phase', files_seen: 3 });
  assert.equal(result.phase, 'unknown');
  assert.equal(result.ingestStatus, null);
  assert.equal(result.counts[0].key, 'files_seen');
});

test('non-canary accounts list files but do not claim they were added to memory', () => {
  const result = readSyncResult({
    status: 'completed',
    ingest_status: 'skipped',
    ingest_skipped_reason: 'retention_flags_off',
    files_seen: 9,
    files_written: 0,
    objects_synced: { file: 0 },
    data_mode: 'preview',
    note: 'Files were analyzed and added to memory.',
    truncated: false,
  });
  assert.equal(result.phase, 'completed');
  assert.equal(result.ingestStatus, 'skipped');
  assert.match(result.headline, /nothing was added to memory/i);
  assert.match(result.headline, /isn't enabled/i);
  assert.equal(result.note, null);
  assert.equal(result.toast, result.headline);
  assert.equal(result.dataMode, 'preview');
  assert.equal(dataModeLabel(result.dataMode), 'Preview');
  assert.equal(dataModeLabel('live_readonly'), 'Live read-only');
});

test('paused, partial, and blocked ingestion are said plainly', () => {
  const paused = readSyncResult({
    status: 'completed',
    ingest_status: 'skipped',
    ingest_skipped_reason: 'ingest_paused',
    note: 'Hold on.',
  });
  assert.match(paused.headline, /Ingestion is paused/);
  assert.equal(paused.toast, 'Hold on.');
  assert.doesNotMatch(paused.headline, /added to memory yet because ingestion isn't enabled/);

  const partial = readSyncResult({ status: 'completed', ingest_status: 'partial', note: 'Part way.' });
  assert.match(partial.headline, /Some listed files were added to memory/);

  const blocked = readSyncResult({ status: 'completed', ingest_status: 'blocked' });
  assert.match(blocked.headline, /Ingestion is blocked/);
  assert.doesNotMatch(blocked.headline, /were analyzed/);
});

test('a failed listing is HTTP-shaped as status failed and shows errors briefly', () => {
  const result = readSyncResult({
    status: 'failed',
    ingest_status: 'failed',
    files_seen: 2,
    note: 'Could not list the folder.',
    errors: ['quota exceeded', { message: 'file abc denied' }, 'third', 'fourth'],
    data_mode: 'live_readonly',
  });
  assert.equal(result.phase, 'failed');
  assert.equal(result.toast, 'Could not list the folder.');
  assert.match(result.headline, /listing failed/i);
  assert.match(result.headline, /Nothing was added to memory/);
  assert.doesNotMatch(result.headline, /were added to memory|were analyzed/);
  assert.deepEqual(result.errors, ['quota exceeded', 'file abc denied', 'third']);
  assert.equal(result.counts[0].value, 2);
});

test('written ingestion may say files were added to memory', () => {
  const result = readSyncResult({ ...DRIVE_RUN, note: '' });
  assert.match(result.headline, /added to memory/);
  assert.equal(result.toast, result.headline);
});

test('sync HTTP conflict that is already running is in progress', () => {
  assert.equal(syncFailurePhase('Sync already in progress'), 'in_progress');
  assert.equal(syncFailurePhase('Connector not found'), 'failed');
  assert.equal(syncFailureView('Sync already in progress').phase, 'in_progress');
  assert.deepEqual(syncFailureView('Sync already in progress').counts, []);
  assert.equal(syncFailureView('Connector not found').phase, 'failed');
});

test('Google Drive authorize does not send redirect_uri', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const view = fs.readFileSync(path.join(root, 'app/Components/dashboard/ConnectorsView.tsx'), 'utf8');
  const start = view.indexOf("if (provider === 'google_drive')");
  const branch = view.slice(start, view.indexOf('const redirectUri', start));
  assert.ok(start > 0);
  assert.match(branch, /authorizeGoogleDrive\(projectId\)/);
  assert.doesNotMatch(branch, /redirect_uri|redirectUri|\/dashboard/);
  assert.match(view, /callbackProvider/);
  assert.match(view, /fetchProjectConnectors\(projectId, \{ strict: true \}\)/);

  const api = fs.readFileSync(path.join(root, 'app/lib/customObjectsApi.ts'), 'utf8');
  const fn = api.slice(api.indexOf('export async function authorizeGoogleDrive'), api.indexOf('export async function fetchProjectConnectors'));
  assert.match(fn, /googleDriveAuthorizeBody\(projectId\)/);
  assert.doesNotMatch(fn, /redirect_uri/);
  assert.deepEqual(Object.keys(googleDriveAuthorizeBody('p')), ['project_id']);
});

test('connection row prefers a healthy connector and ignores disconnected', () => {
  const rows = [
    { id: 'old', provider: 'google_drive', status: 'disconnected' },
    { id: 'bad', provider: 'google_drive', status: 'error' },
    { id: 'live', provider: 'google_drive', status: 'connected' },
  ];
  assert.equal(connectionForProvider(rows, 'google_drive').id, 'live');
  assert.equal(connectionForProvider([{ id: 'bad', provider: 'google_drive', status: 'error' }], 'google_drive').id, 'bad');
  assert.equal(connectionForProvider([], 'google_drive'), null);
});
