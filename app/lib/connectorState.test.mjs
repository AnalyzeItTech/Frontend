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
  googleDriveAuthorizeBody,
  oauthRedirectUrl,
  readConnectorCallback,
  readSyncResult,
  syncFailurePhase,
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

test('oauth redirect accepts https auth_url and rejects anything else', () => {
  assert.equal(oauthRedirectUrl({ auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' }), 'https://accounts.google.com/o/oauth2/v2/auth?x=1');
  assert.equal(oauthRedirectUrl({ url: 'https://accounts.google.com/o/oauth2/v2/auth' }), 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(oauthRedirectUrl({ auth_url: 'http://accounts.google.com/o/oauth2/v2/auth' }), null);
  assert.equal(oauthRedirectUrl({ auth_url: 'javascript:alert(1)' }), null);
  assert.equal(oauthRedirectUrl({}), null);
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

test('sync succeeded shows the counts the server returned, including zero', () => {
  const result = readSyncResult({
    status: 'succeeded',
    counts: { files: 12, docs: 3, sheets: 0, slides: 1 },
  });
  assert.equal(result.phase, 'succeeded');
  assert.deepEqual(result.counts.map((count) => [count.key, count.value]), [
    ['files', 12],
    ['docs', 3],
    ['sheets', 0],
    ['slides', 1],
  ]);
});

test('sync in progress and failed keep their phase and do not invent counts', () => {
  const running = readSyncResult({ status: 'in_progress', note: 'Walking Drive' });
  assert.equal(running.phase, 'in_progress');
  assert.deepEqual(running.counts, []);
  assert.equal(running.message, 'Walking Drive');

  const failed = readSyncResult({ status: 'failed', message: 'Drive quota exceeded', counts: { failed: 2 } });
  assert.equal(failed.phase, 'failed');
  assert.equal(failed.message, 'Drive quota exceeded');
  assert.deepEqual(failed.counts, [{ key: 'failed', label: 'Failed', value: 2 }]);

  const empty = readSyncResult({ status: 'succeeded' });
  assert.equal(empty.phase, 'succeeded');
  assert.deepEqual(empty.counts, []);
});

test('top-level count fields are read when there is no counts object', () => {
  const result = readSyncResult({ status: 'success', files_synced: 4, updated: 1, duration_ms: 90 });
  assert.equal(result.phase, 'succeeded');
  assert.deepEqual(result.counts.map((count) => count.key), ['files_synced', 'updated']);
});

test('sync HTTP conflict that is already running is in progress', () => {
  assert.equal(syncFailurePhase('Sync already in progress'), 'in_progress');
  assert.equal(syncFailurePhase('Connector not found'), 'failed');
});

test('Google Drive authorize does not send redirect_uri', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const view = fs.readFileSync(path.join(root, 'app/Components/dashboard/ConnectorsView.tsx'), 'utf8');
  const start = view.indexOf("if (provider === 'google_drive')");
  const branch = view.slice(start, view.indexOf('const redirectUri', start));
  assert.ok(start > 0);
  assert.match(branch, /authorizeGoogleDrive\(projectId\)/);
  assert.doesNotMatch(branch, /redirect_uri|redirectUri|\/dashboard/);

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
