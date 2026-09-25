/**
 * Context-wall signals that should open the existing Upgrade modal.
 * Run: node --test app/lib/contextWall.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  CLIENT_CONTEXT_TRUNCATED,
  CONTEXT_UPGRADE_COPY,
  FREE_CLIENT_CONTEXT_CHARS,
  PIPELINE_FAIL_TEXT,
  PIPELINE_INSUFFICIENT_DATA,
  answerIsOnlyPipelineFail,
  contextWallFromStreamEvent,
  contextWallSummary,
  detectContextWall,
  mergeContextWall,
  readQuotaSignal,
} from './contextWall.mjs';

describe('context wall signals', () => {
  it('reads error.code the same way quota errors nest a code', () => {
    const signal = contextWallFromStreamEvent({
      event: 'error',
      payload: {
        error: {
          code: PIPELINE_INSUFFICIENT_DATA,
          message: PIPELINE_FAIL_TEXT,
          upgrade_required: true,
          recoverable: true,
        },
      },
    });
    assert.ok(signal);
    assert.equal(signal.code, PIPELINE_INSUFFICIENT_DATA);
    assert.equal(signal.pipeline, true);
    assert.equal(signal.upgradeRequired, true);
    assert.equal(signal.recoverable, true);
    assert.equal(signal.softFail, true);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.message, PIPELINE_FAIL_TEXT);
  });

  it('reads final.error_code plus upgrade_required and recoverable', () => {
    const signal = contextWallFromStreamEvent({
      event: 'final',
      payload: {
        text: 'Partial answer from the truncated window.',
        error_code: CLIENT_CONTEXT_TRUNCATED,
        upgrade_required: true,
        recoverable: true,
      },
    });
    assert.ok(signal);
    assert.equal(signal.code, CLIENT_CONTEXT_TRUNCATED);
    assert.equal(signal.truncated, true);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.softFail, true);
  });

  it('accepts top-level code, the TOKEN_BUDGET / LLM_MONTHLY_QUOTA field', () => {
    const signal = detectContextWall({
      code: CLIENT_CONTEXT_TRUNCATED,
      upgrade_required: true,
      recoverable: true,
      message: 'Client context was shortened.',
    });
    assert.ok(signal);
    assert.equal(signal.truncated, true);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.softFail, true);
  });

  it('opens upgrade when upgrade_required is true without inventing a code', () => {
    const signal = detectContextWall({ upgrade_required: true, recoverable: true });
    assert.ok(signal);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.softFail, true);
    assert.equal(signal.code, undefined);
    assert.equal(signal.truncated, false);
    assert.equal(signal.pipeline, false);
  });

  it('keeps TOKEN_BUDGET and LLM_MONTHLY_QUOTA on the quota path', () => {
    const budget = detectContextWall({
      code: 'TOKEN_BUDGET',
      upgrade_required: true,
      recoverable: false,
      message: 'Token budget reached.',
    });
    const monthly = detectContextWall({
      code: 'LLM_MONTHLY_QUOTA',
      upgrade_required: true,
      message: 'Monthly LLM run limit reached.',
    });
    assert.equal(budget, null);
    assert.equal(monthly, null);
    assert.equal(readQuotaSignal({ code: 'TOKEN_BUDGET', upgrade_required: true })?.code, 'TOKEN_BUDGET');
    assert.equal(
      readQuotaSignal({ code: 'LLM_MONTHLY_QUOTA', upgrade_required: true, recoverable: false })?.upgradeRequired,
      true,
    );
    assert.equal(
      readQuotaSignal({
        error: { code: PIPELINE_INSUFFICIENT_DATA, upgrade_required: true, recoverable: true },
      }),
      null,
    );
  });

  it('merges error.code and final.error_code when both context codes arrive', () => {
    const merged = mergeContextWall(
      detectContextWall({
        error: { code: CLIENT_CONTEXT_TRUNCATED, upgrade_required: true, recoverable: true },
      }),
      detectContextWall({ error_code: PIPELINE_INSUFFICIENT_DATA, recoverable: true }),
    );
    assert.ok(merged);
    assert.equal(merged.truncated, true);
    assert.equal(merged.pipeline, true);
    assert.equal(merged.openUpgrade, true);
    assert.equal(merged.softFail, true);
    assert.equal(merged.code, CLIENT_CONTEXT_TRUNCATED);
    const summary = contextWallSummary(merged);
    assert.match(summary, /soft-truncated/i);
    assert.match(summary, /pipeline could not complete/i);
    assert.match(summary, /not invented/i);
    assert.match(summary, /RLM/);
  });

  it('does not treat fail text or invented code keys as a signal', () => {
    assert.equal(
      contextWallFromStreamEvent({
        event: 'model_delta',
        payload: { text: PIPELINE_FAIL_TEXT },
      }),
      null,
    );
    assert.equal(
      contextWallFromStreamEvent({
        event: 'run_completed',
        payload: { status: 'failed', fail_text: PIPELINE_FAIL_TEXT },
      }),
      null,
    );
    assert.equal(detectContextWall({ fail_code: PIPELINE_INSUFFICIENT_DATA }), null);
    assert.equal(detectContextWall({ upgrade_required: 'true' }), null);
    assert.equal(detectContextWall({ client_context: { code: CLIENT_CONTEXT_TRUNCATED } }), null);
    assert.equal(answerIsOnlyPipelineFail(PIPELINE_FAIL_TEXT), true);
    assert.equal(answerIsOnlyPipelineFail(`${PIPELINE_FAIL_TEXT}.`), true);
    assert.equal(
      answerIsOnlyPipelineFail(`Here is the analysis. ${PIPELINE_FAIL_TEXT} More findings follow in detail.`),
      false,
    );
  });

  it('still soft-fails a context code when recoverable is omitted, not when it is false', () => {
    const omitted = detectContextWall({ error_code: PIPELINE_INSUFFICIENT_DATA });
    const hard = detectContextWall({
      error: { code: PIPELINE_INSUFFICIENT_DATA, recoverable: false, upgrade_required: true },
    });
    assert.equal(omitted?.softFail, true);
    assert.equal(omitted?.openUpgrade, true);
    assert.equal(hard?.softFail, false);
    assert.equal(hard?.openUpgrade, true);
    assert.equal(hard?.recoverable, false);
  });

  it('keeps upgrade copy honest about the Free wall', () => {
    assert.equal(FREE_CLIENT_CONTEXT_CHARS, 20000);
    assert.match(CONTEXT_UPGRADE_COPY.title, /Free hit a context limit/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /20,000/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /soft-truncates/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /do not invent/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /larger client context/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /compress/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /RLM/);
    const pipeline = contextWallSummary({
      code: PIPELINE_INSUFFICIENT_DATA,
      truncated: false,
      pipeline: true,
      upgradeRequired: true,
      recoverable: true,
      openUpgrade: true,
      softFail: true,
    });
    assert.match(pipeline, /not reconstructed/i);
    assert.match(pipeline, /Premium keeps a larger client context/i);
  });
});

describe('research chat wires the existing upgrade modal', () => {
  const page = fs.readFileSync(new URL('../research/page.tsx', import.meta.url), 'utf8');
  const modal = fs.readFileSync(new URL('../Components/billing/UpgradeModal.tsx', import.meta.url), 'utf8');

  it('opens UpgradeModal reason=context instead of a second dialog', () => {
    assert.match(page, /contextWallFromStreamEvent/);
    assert.match(page, /reason: 'context'/);
    assert.match(page, /softFail/);
    assert.match(page, />\s*Retry\s*</);
    assert.match(page, />\s*Upgrade\s*</);
    assert.match(modal, /CONTEXT_UPGRADE_COPY/);
    assert.match(modal, /Not now/);
    assert.match(modal, /View plans/);
    assert.doesNotMatch(page, /fail_code|UPGRADE_REQUIRED/);
  });
});
