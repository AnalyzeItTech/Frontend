import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  CHAT_PATH,
  NEW_ACCOUNT_SESSION_KEY,
  ONBOARDING_FILE_EXTENSIONS,
  ONBOARDING_PATH,
  accountLooksNew,
  applyProgress,
  chatHref,
  connectorsHref,
  createMemoryStorage,
  decideOnboarding,
  destinationAfterAuth,
  driveConnectorFromApi,
  fileChoiceError,
  goToStep,
  isGoogleDriveProvider,
  labelZeroTokenTool,
  loadProgress,
  markCompleted,
  markSkipped,
  mergeCitedSources,
  normalizeCitedSources,
  noteRouteDecision,
  pickWorkspaceProjectId,
  postAuthPath,
  progressForResume,
  rememberAnswer,
  rememberQuestion,
  saveProgress,
  seedNewAccount,
  selectDrive,
  selectFile,
  startProgress,
  suggestedQuestions,
  textFromPayload,
  uploadFailed,
  usableChatProjectId,
  usableDriveConnector,
  workspaceLooksUnused,
  zeroTokenToolFromRoute,
} from './onboarding.mjs';

const NOW = Date.parse('2026-10-05T12:00:00.000Z');
const file = {
  attachment_id: 'att_1',
  filename: 'sales.csv',
  status: 'ready',
  extracted_summary: 'Two columns: month and amount.',
  notes: [],
  project_id: 'proj_1',
};

describe('first-run decision', () => {
  it('hides signed-out visitors', () => {
    const decision = decideOnboarding({ userId: '', isNewAccount: true });
    assert.equal(decision.action, 'hide');
    assert.equal(decision.reason, 'signed-out');
  });

  it('shows a new account and asks to persist the start', () => {
    const decision = decideOnboarding({ userId: 'u1', isNewAccount: true, now: NOW });
    assert.equal(decision.action, 'show');
    assert.equal(decision.persist, true);
    assert.equal(decision.reason, 'new-account');
    assert.equal(decision.progress.step, 'data');
    assert.equal(decision.progress.status, 'active');
  });

  it('resumes an in-progress step', () => {
    const stored = selectFile(startProgress('u1', NOW), file, NOW);
    const decision = decideOnboarding({ userId: 'u1', stored, now: NOW });
    assert.equal(decision.action, 'show');
    assert.equal(decision.reason, 'resume');
    assert.equal(decision.persist, false);
    assert.equal(decision.progress.step, 'question');
    assert.equal(decision.progress.attachment.filename, 'sales.csv');
  });

  it('returns to the question when an answer never arrived', () => {
    const asked = rememberQuestion(selectFile(startProgress('u1', NOW), file, NOW), 'What is in sales.csv?', NOW);
    assert.equal(asked.step, 'insight');
    const resumed = progressForResume(asked);
    assert.equal(resumed.step, 'question');
    assert.equal(resumed.question, 'What is in sales.csv?');
  });

  it('keeps a saved answer on the insight step', () => {
    const asked = rememberQuestion(selectFile(startProgress('u1', NOW), file, NOW), 'What is in sales.csv?', NOW);
    const saved = rememberAnswer(asked, { answer: 'October is the high month.', sources: [], runId: 'run_1' }, NOW);
    const decision = decideOnboarding({ userId: 'u1', stored: saved, now: NOW });
    assert.equal(decision.progress.step, 'insight');
    assert.match(decision.progress.answer, /October/);
  });

  it('does not show a skipped, completed, or established account again', () => {
    for (const status of ['skipped', 'completed', 'established']) {
      const stored = { ...startProgress('u1', NOW), status };
      const decision = decideOnboarding({ userId: 'u1', stored, isNewAccount: true, now: NOW });
      assert.equal(decision.action, 'hide');
      assert.equal(decision.reason, status);
    }
  });

  it('leaves older accounts alone', () => {
    const decision = decideOnboarding({
      userId: 'u1',
      createdAt: '2026-09-01T00:00:00.000Z',
      now: NOW,
    });
    assert.equal(decision.action, 'hide');
    assert.equal(decision.reason, 'not-first-run');
    assert.equal(decision.persist, false);
  });

  it('checks the workspace for a recent account before showing', () => {
    const pending = decideOnboarding({
      userId: 'u1',
      createdAt: '2026-10-05T10:00:00.000Z',
      projectCount: null,
      now: NOW,
    });
    assert.equal(pending.action, 'check-workspace');
    const empty = decideOnboarding({
      userId: 'u1',
      createdAt: '2026-10-05T10:00:00.000Z',
      projectCount: 0,
      now: NOW,
    });
    assert.equal(empty.action, 'show');
    assert.equal(empty.reason, 'first-run');
    const autoWorkspace = decideOnboarding({
      userId: 'u1',
      createdAt: '2026-10-05T10:00:00.000Z',
      projectCount: 1,
      workspaceUnused: true,
      now: NOW,
    });
    assert.equal(autoWorkspace.action, 'show');
    assert.equal(autoWorkspace.reason, 'first-run');
    const started = decideOnboarding({
      userId: 'u1',
      createdAt: '2026-10-05T10:00:00.000Z',
      projectCount: 1,
      workspaceUnused: false,
      now: NOW,
    });
    assert.equal(started.action, 'hide');
    assert.equal(started.reason, 'already-started');
    assert.equal(started.progress.status, 'established');
    assert.equal(started.persist, true);
  });

  it('treats an empty auto workspace as unused and widgets as started', () => {
    assert.equal(workspaceLooksUnused([]), true);
    assert.equal(workspaceLooksUnused([{ widget_count: 0, name: "Ada's Workspace" }]), true);
    assert.equal(workspaceLooksUnused([{ widget_count: 0 }, { widget_count: 3 }]), false);
    assert.equal(workspaceLooksUnused(null), false);
  });

  it('treats a same-day created_at as new and rejects a future or blank stamp', () => {
    assert.equal(accountLooksNew('2026-10-05T11:00:00.000Z', NOW), true);
    assert.equal(accountLooksNew('2026-10-03T11:00:00.000Z', NOW), false);
    assert.equal(accountLooksNew('not-a-date', NOW), false);
    assert.equal(accountLooksNew(null, NOW), false);
    assert.equal(accountLooksNew('2026-10-06T12:00:00.000Z', NOW), false);
  });
});

describe('progress storage', () => {
  it('resumes per user and keeps the other account’s record', () => {
    const storage = createMemoryStorage();
    const first = selectFile(startProgress('a', NOW), file, NOW);
    saveProgress(storage, first);
    saveProgress(storage, startProgress('b', NOW));
    const loaded = loadProgress(storage, 'a');
    assert.equal(loaded.step, 'question');
    assert.equal(loaded.attachment.attachment_id, 'att_1');
    assert.equal(loadProgress(storage, 'b').step, 'data');
  });

  it('ignores corrupt storage', () => {
    const storage = createMemoryStorage({ analyzeit_onboarding_v1: '{not json' });
    assert.equal(loadProgress(storage, 'a'), null);
  });

  it('seeds a new account once and does not rewind an in-progress step', () => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    const seeded = seedNewAccount(local, session, 'u1');
    assert.equal(seeded.step, 'data');
    assert.equal(session.getItem(NEW_ACCOUNT_SESSION_KEY), '1');
    saveProgress(local, selectFile(seeded, file, NOW));
    const again = seedNewAccount(local, session, 'u1');
    assert.equal(again.step, 'question');
  });

  it('marks skip and completion without dropping the user id', () => {
    const started = selectFile(startProgress('u1', NOW), file, NOW);
    assert.equal(markSkipped(started, NOW).status, 'skipped');
    const done = rememberAnswer(rememberQuestion(started, 'What is in sales.csv?', NOW), { answer: 'A table.' }, NOW);
    assert.equal(markCompleted(done, NOW).status, 'completed');
    assert.equal(markCompleted(done, NOW).answer, 'A table.');
  });

  it('does not jump ahead of the saved step', () => {
    const started = startProgress('u1', NOW);
    assert.equal(goToStep(started, 'insight', NOW).step, 'data');
    const asked = rememberQuestion(selectFile(started, file, NOW), 'What is in sales.csv?', NOW);
    assert.equal(goToStep(asked, 'data', NOW).step, 'data');
    assert.equal(goToStep(asked, 'data', NOW).attachment.filename, 'sales.csv');
  });
});

describe('where a new account lands', () => {
  it('sends the default workspace to onboarding and honors an explicit next path', () => {
    assert.equal(postAuthPath('/research', true), ONBOARDING_PATH);
    assert.equal(postAuthPath('/home', true), ONBOARDING_PATH);
    assert.equal(postAuthPath('/billing', true), '/billing');
    assert.equal(postAuthPath('/research', false), CHAT_PATH);
    assert.equal(destinationAfterAuth('/research', true, 'active'), ONBOARDING_PATH);
    assert.equal(destinationAfterAuth('/research', true, 'skipped'), CHAT_PATH);
    assert.equal(destinationAfterAuth('/billing', true, null), '/billing');
    assert.equal(chatHref('p 1'), '/research?project=p%201');
    assert.equal(chatHref(''), CHAT_PATH);
    assert.equal(chatHref('_chat_user'), CHAT_PATH);
    assert.equal(connectorsHref('_chat_user'), '/connectors');
    assert.equal(connectorsHref('p 1'), '/connectors?project=p%201');
  });
});

describe('data step', () => {
  it('accepts the chat attachment extensions and nothing else', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, 'attachmentsApi.ts'), 'utf8');
    const listed = [...source.matchAll(/'\.([a-z0-9]+)'/g)].map((match) => match[1]);
    assert.deepEqual(listed, [...ONBOARDING_FILE_EXTENSIONS]);
    assert.equal(fileChoiceError('sales.csv'), null);
    assert.equal(fileChoiceError('notes.PDF'), null);
    assert.equal(fileChoiceError('deck.pptx'), 'This file type can’t be uploaded. Use a CSV, spreadsheet, JSON, text, PDF, or Tableau file.');
    assert.equal(fileChoiceError(''), 'Choose a file to upload.');
  });

  it('moves to the question after a real file and refuses a failed extract', () => {
    const progress = selectFile(startProgress('u1', NOW), file, NOW);
    assert.equal(progress.step, 'question');
    assert.equal(progress.dataKind, 'file');
    assert.equal(progress.projectId, 'proj_1');
    const scratchFile = { ...file, project_id: '_chat_user' };
    const scratchOnly = selectFile(startProgress('u1', NOW), scratchFile, NOW);
    assert.equal(scratchOnly.projectId, '_chat_user');
    assert.equal(usableChatProjectId(scratchOnly.projectId), null);
    const pinned = applyProgress(startProgress('u1', NOW), { projectId: 'proj_9' }, NOW);
    assert.equal(selectFile(pinned, scratchFile, NOW).projectId, 'proj_9');
    assert.equal(pickWorkspaceProjectId([{ id: '_chat_user' }, { id: 'proj_1' }], '_chat_user'), 'proj_1');
    assert.equal(pickWorkspaceProjectId([{ id: 'proj_1' }, { id: 'proj_2' }], 'proj_2'), 'proj_2');
    const kept = rememberAnswer(pinned, { answer: 'Three rows.', projectId: '_chat_user' }, NOW);
    assert.equal(kept.projectId, 'proj_9');
    const failed = selectFile(startProgress('u1', NOW), { ...file, status: 'failed', notes: ['No text.'] }, NOW);
    assert.equal(failed.step, 'data');
    assert.equal(uploadFailed({ status: 'failed' }), true);
  });

  it('offers only a connected Google Drive source', () => {
    assert.equal(isGoogleDriveProvider('Google Drive'), true);
    assert.equal(isGoogleDriveProvider('google-drive'), true);
    assert.equal(isGoogleDriveProvider('notion'), false);
    assert.equal(isGoogleDriveProvider('slack'), false);
    assert.equal(isGoogleDriveProvider('google'), false);
    const live = { id: 'c1', provider: 'google_drive', status: 'connected', name: 'Work drive' };
    assert.equal(usableDriveConnector(live), true);
    assert.deepEqual(driveConnectorFromApi(live, 'p1'), {
      id: 'c1',
      projectId: 'p1',
      provider: 'google_drive',
      name: 'Work drive',
    });
    assert.equal(usableDriveConnector({ ...live, provider: 'notion', status: 'connected' }), false);
    assert.equal(usableDriveConnector({ ...live, provider: 'slack' }), false);
    assert.equal(usableDriveConnector({ ...live, status: 'disconnected' }), false);
    assert.equal(usableDriveConnector({ ...live, data_mode: 'seed_demo' }), false);
    assert.equal(usableDriveConnector({ ...live, data_mode: 'preview' }), false);
    assert.equal(driveConnectorFromApi({ ...live, provider: 'slack' }, 'p1'), null);
    const chosen = selectDrive(startProgress('u1', NOW), driveConnectorFromApi(live, 'p1'), NOW);
    assert.equal(chosen.step, 'question');
    assert.equal(chosen.dataKind, 'drive');
    assert.equal(chosen.connector.name, 'Work drive');
    assert.equal(chosen.attachment, null);
  });
});

describe('suggested questions', () => {
  it('asks about the uploaded file without inventing figures', () => {
    const questions = suggestedQuestions({ filename: 'sales.csv', extractedSummary: 'month, amount' });
    assert.deepEqual(questions, [
      'What is in sales.csv?',
      'Summarize sales.csv in plain language.',
      'What should I look at first in sales.csv?',
    ]);
    for (const question of questions) {
      assert.equal(/\b\d+\b/.test(question), false);
      assert.equal(/second|minute|instant|unlimited|capacity/i.test(question), false);
    }
    assert.deepEqual(suggestedQuestions({ filename: 'notes.pdf' }).length, 2);
    assert.deepEqual(suggestedQuestions({}), []);
  });

  it('asks about a connected drive by its name', () => {
    assert.deepEqual(suggestedQuestions({ connectorName: 'Work drive' }), [
      'What data is available from Work drive?',
      'Summarize what Work drive has synced.',
    ]);
  });
});

describe('answer sources', () => {
  it('keeps cited hosts and drops empty rows', () => {
    const sources = normalizeCitedSources([
      { url: 'https://www.example.com/a', title: 'A', verified: true },
      { host: 'data.example.org' },
      { title: 'no location' },
      null,
    ]);
    assert.equal(sources.length, 2);
    assert.equal(sources[0].host, 'example.com');
    assert.equal(sources[0].verified, true);
    assert.equal(sources[1].url, undefined);
    const merged = mergeCitedSources(sources, [{ url: 'https://www.example.com/a', title: 'Updated' }]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].title, 'Updated');
  });

  it('reads stream text and zero-token routes without treating a failure as success', () => {
    assert.equal(textFromPayload([{ text: 'Hello' }, ' there']), 'Hello there');
    assert.equal(zeroTokenToolFromRoute('zero_token_tool:weather_lookup'), 'weather_lookup');
    assert.equal(zeroTokenToolFromRoute('zero_token_tool_failed:weather_lookup'), null);
    assert.equal(labelZeroTokenTool('currency_converter'), 'FX');
    assert.deepEqual(noteRouteDecision({ reason: 'zero_token_tool:stock_lookup' }), { tool: 'stock_lookup', failed: false });
    assert.deepEqual(noteRouteDecision({ route: 'zero_token_tool_failed:calculator' }), { tool: null, failed: true });
  });
});
