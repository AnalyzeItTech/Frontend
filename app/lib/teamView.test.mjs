import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acceptErrorMessage, inviteErrorMessage, loginPathFor, memberLine, VIEWER_CAN, VIEWER_CANNOT } from './teamView.mjs';

test('members are described as they are: invited people are not yet members', () => {
  assert.equal(memberLine({ email: 'a@x.com', status: 'active' }), 'a@x.com, can view');
  assert.match(memberLine({ email: 'a@x.com', status: 'invited' }), /waiting for them to accept/);
  assert.equal(memberLine(null), '');
});

test('what a viewer can and cannot do is stated, and matches the server', () => {
  assert.ok(VIEWER_CAN.length >= 2 && VIEWER_CANNOT.some((t) => /Change or delete/.test(t)) && VIEWER_CANNOT.some((t) => /assistant/.test(t)));
  // the promise is only as good as the server: these endpoints are the viewer ones in the Backend (kept in step by hand, checked in its tests)
  const be = readFileSync(new URL('../../../Backend/app/routes.py', import.meta.url), 'utf8').toString();
  assert.match(be, /async def require_project_viewer/);
}, { skip: !process.env.CHECK_BACKEND_SOURCE });

test('errors are plain', () => {
  assert.match(inviteErrorMessage({ status: 404 }), /Only the owner/);
  assert.equal(inviteErrorMessage({ status: 422, message: 'They already have access.' }), 'They already have access.');
  assert.match(acceptErrorMessage({ status: 403 }), /different e-mail address/);
  assert.match(acceptErrorMessage({ status: 404 }), /not valid any more/);
});

test('signing in for an invitation comes straight back to it, and nothing else can be smuggled through', () => {
  const t = 'AbCdEfGhIjKlMnOpQrStUv12';
  assert.equal(loginPathFor(t), `/login?next=${encodeURIComponent(`/invite/${t}`)}`);
  for (const bad of ['', 'short', '../../etc', 'https://evil.example/x', 'a'.repeat(100), 'x y z x y z x y z x y z']) assert.equal(loginPathFor(bad), '/login', bad);
});

test('the team panel is on the connectors screen and the invitation page needs no account to read', () => {
  assert.match(readFileSync(new URL('../Components/dashboard/ConnectorsView.tsx', import.meta.url), 'utf8'), /<TeamPanel projectId=\{projectId\}/);
  const api = readFileSync(new URL('./teamApi.ts', import.meta.url), 'utf8');
  const read = api.slice(api.indexOf('export async function readInvite'), api.indexOf('export async function acceptInvite'));
  assert.doesNotMatch(read, /getAuthHeaders/);   // reading an invitation is public: the person decides before signing in
});
