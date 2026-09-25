/**
 * Context-wall signals that should open the existing Upgrade modal.
 * Run: node --test app/lib/contextWall.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  CAPACITY_UPGRADE_COPY,
  CLIENT_CONTEXT_TRUNCATED,
  CONTEXT_RETENTION_TOKENS,
  CONTEXT_UPGRADE_COPY,
  FREE_CLIENT_CONTEXT_LIMIT,
  formatFreeContextLimit,
  quoteFreeContextLimit,
  PIPELINE_FAIL_TEXT,
  PIPELINE_INSUFFICIENT_DATA,
  answerIsOnlyPipelineFail,
  contextUpgradeCopy,
  contextWallFromStreamEvent,
  contextWallSummary,
  detectContextWall,
  formatContextRetention,
  mergeContextWall,
  readQuotaSignal,
  retentionTokensFromEntitlements,
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
    assert.equal(signal.truncated, false);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.upgradeReason, 'capacity');
    assert.equal(signal.message, PIPELINE_FAIL_TEXT);
    const summary = contextWallSummary(signal);
    assert.equal(summary, PIPELINE_FAIL_TEXT);
    assert.doesNotMatch(summary, /10M|20,?000|20k|soft-truncat|context limit/i);
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
    assert.equal(signal.upgradeReason, 'context');
    // Truncation is a nudge — must not softFail / block the pipeline.
    assert.equal(signal.softFail, false);
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
    assert.equal(signal.upgradeReason, 'context');
    assert.equal(signal.softFail, false);
  });

  it('opens a non-context upgrade when upgrade_required is true without a truncate', () => {
    const signal = detectContextWall({ upgrade_required: true, recoverable: true });
    assert.ok(signal);
    assert.equal(signal.openUpgrade, true);
    assert.equal(signal.upgradeReason, 'capacity');
    // No pipeline code → nudge only, not a softFail wall.
    assert.equal(signal.softFail, false);
    assert.equal(signal.code, undefined);
    assert.equal(signal.truncated, false);
    assert.equal(signal.pipeline, false);
    assert.doesNotMatch(contextWallSummary(signal), /10M|20,?000|20k|soft-truncat|context limit/i);
  });


  it('truncation nudge never softFails; only PIPELINE_INSUFFICIENT_DATA does', () => {
    const nudge = detectContextWall({
      code: CLIENT_CONTEXT_TRUNCATED,
      upgrade_required: true,
      recoverable: true,
    });
    const wall = detectContextWall({
      code: PIPELINE_INSUFFICIENT_DATA,
      upgrade_required: true,
      recoverable: true,
    });
    const both = mergeContextWall(nudge, wall);
    assert.equal(nudge?.softFail, false);
    assert.equal(nudge?.openUpgrade, true);
    assert.equal(nudge?.upgradeReason, 'context');
    assert.equal(wall?.softFail, true);
    assert.equal(wall?.openUpgrade, true);
    assert.equal(wall?.upgradeReason, 'capacity');
    assert.equal(both?.truncated, true);
    assert.equal(both?.pipeline, true);
    assert.equal(both?.softFail, true);
    assert.equal(both?.upgradeReason, 'context');
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
    assert.equal(merged.upgradeReason, 'context');
    assert.equal(merged.softFail, true);
    assert.equal(merged.code, CLIENT_CONTEXT_TRUNCATED);
    const summary = contextWallSummary(merged);
    assert.match(summary, /Free context retention \(memory\) is 10M/);
    assert.match(summary, /pipeline could not complete/i);
    assert.match(summary, /not invented/i);
    assert.match(summary, /500M/);
    assert.match(summary, /1B/);
    assert.match(summary, /RLM/);
    assert.doesNotMatch(summary, /20,000|20000|20k|characters|soft-truncat/i);
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
    assert.equal(omitted?.openUpgrade, false);
    assert.equal(omitted?.upgradeReason, undefined);
    assert.equal(hard?.softFail, false);
    assert.equal(hard?.openUpgrade, true);
    assert.equal(hard?.upgradeReason, 'capacity');
    assert.equal(hard?.recoverable, false);
  });

  it('does not call a pipeline-only soft-fail a context limit', () => {
    const signal = detectContextWall({
      code: PIPELINE_INSUFFICIENT_DATA,
      message: 'Client context was truncated at 20000 characters',
      upgrade_required: true,
      recoverable: true,
    });
    assert.ok(signal);
    assert.equal(signal.pipeline, true);
    assert.equal(signal.truncated, false);
    assert.equal(signal.upgradeReason, 'capacity');
    assert.equal(signal.softFail, true);
    const summary = contextWallSummary(signal);
    assert.equal(summary, PIPELINE_FAIL_TEXT);
    assert.doesNotMatch(summary, /10M|20,?000|20k|soft-truncat|context limit|not reconstructed|context retention/i);
    assert.equal(
      detectContextWall({ truncated: true, used: 100, limit: 100 }),
      null,
    );
  });

  it('treats an explicit truncate notice as the context sheet, even with a pipeline code', () => {
    const notice = detectContextWall({
      code: PIPELINE_INSUFFICIENT_DATA,
      truncate_notice: CLIENT_CONTEXT_TRUNCATED,
      upgrade_required: true,
      recoverable: true,
    });
    const flagged = detectContextWall({
      error: {
        code: PIPELINE_INSUFFICIENT_DATA,
        truncated: true,
        upgrade_required: true,
        recoverable: true,
      },
    });
    assert.equal(notice?.truncated, true);
    assert.equal(notice?.pipeline, true);
    assert.equal(notice?.softFail, true);
    assert.equal(notice?.upgradeReason, 'context');
    assert.equal(flagged?.truncated, true);
    assert.equal(flagged?.upgradeReason, 'context');
    assert.ok(notice);
    assert.match(contextWallSummary(notice), /Free context retention \(memory\) is 10M/);
    assert.match(contextWallSummary(notice), /500M/);
    assert.match(contextWallSummary(notice), /1B/);
    assert.doesNotMatch(contextWallSummary(notice), /20,?000|20k|characters|soft-truncat/i);
    assert.equal(
      detectContextWall({
        code: 'TOKEN_BUDGET',
        upgrade_required: true,
        truncated: true,
      }),
      null,
    );
  });

  it('keeps upgrade copy honest about listed retention', () => {
    assert.equal(FREE_CLIENT_CONTEXT_LIMIT, 10_000_000);
    assert.equal(CONTEXT_RETENTION_TOKENS.free, 10_000_000);
    assert.equal(CONTEXT_RETENTION_TOKENS.premium, 500_000_000);
    assert.equal(CONTEXT_RETENTION_TOKENS.premium_plus, 1_000_000_000);
    assert.equal(formatFreeContextLimit(), '10M');
    assert.equal(formatFreeContextLimit(20_000), '10M');
    assert.equal(formatContextRetention(CONTEXT_RETENTION_TOKENS.premium), '500M');
    assert.equal(formatContextRetention(CONTEXT_RETENTION_TOKENS.premium_plus), '1B');
    assert.equal(quoteFreeContextLimit(null), '10M');
    assert.equal(quoteFreeContextLimit({ max_client_context_chars: 20_000 }), '10M');
    assert.equal(quoteFreeContextLimit({ max_client_context_chars: '20000' }), '10M');
    assert.equal(quoteFreeContextLimit({ limits: { client_context_limit: 10_000_000 } }), '10M');
    assert.equal(quoteFreeContextLimit({ limits: { max_client_context_chars: '10M' } }), '10M');
    assert.equal(quoteFreeContextLimit({ context_retention_tokens: 10_000_000 }), '10M');
    assert.equal(
      quoteFreeContextLimit({
        context_retention_tokens: 10_000_000,
        max_client_context_chars: 500_000_000,
      }),
      '10M',
    );
    assert.equal(quoteFreeContextLimit({ context_retention_tokens: 500_000_000 }), '500M');
    assert.match(CONTEXT_UPGRADE_COPY.title, /Free hit a context limit/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /Free context retention \(memory\) is 10M/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /Premium context retention \(memory\) is 500M/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /VIP is 1B/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /do not invent/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /compress/i);
    assert.match(CONTEXT_UPGRADE_COPY.body, /RLM/);
    assert.doesNotMatch(CONTEXT_UPGRADE_COPY.body, /20,000|20000|20k|characters|soft-truncat|250M|200k|2M/i);
    const live = contextUpgradeCopy(10_000_000);
    assert.match(live.body, /Free context retention \(memory\) is 10M/);
    assert.equal(retentionTokensFromEntitlements({ context_retention_tokens: 10_000_000 }), 10_000_000);
    assert.equal(retentionTokensFromEntitlements({ max_client_context_chars: 20000 }), null);
    const pipeline = contextWallSummary({
      code: PIPELINE_INSUFFICIENT_DATA,
      truncated: false,
      pipeline: true,
      upgradeRequired: true,
      recoverable: true,
      openUpgrade: true,
      upgradeReason: 'capacity',
      softFail: true,
    });
    assert.equal(pipeline, PIPELINE_FAIL_TEXT);
    assert.doesNotMatch(pipeline, /10M|20,?000|20k|soft-truncat|context limit|not reconstructed|context retention/i);
    assert.match(CAPACITY_UPGRADE_COPY.title, /capacity/i);
    assert.match(CAPACITY_UPGRADE_COPY.body, /deeper context mode/i);
    assert.doesNotMatch(CAPACITY_UPGRADE_COPY.title, /context limit/i);
    assert.doesNotMatch(CAPACITY_UPGRADE_COPY.body, /10M|20,?000|20k|soft-truncat|context retention/i);
    const fromLive = contextWallSummary(
      {
        code: CLIENT_CONTEXT_TRUNCATED,
        truncated: true,
        pipeline: false,
        upgradeRequired: true,
        recoverable: true,
        openUpgrade: true,
        upgradeReason: 'context',
        softFail: false,
      },
      '10M',
    );
    assert.match(fromLive, /Free context retention \(memory\) is 10M/);
    assert.doesNotMatch(fromLive, /20,000|characters|soft-truncat/);
  });
});

describe('research chat wires the existing upgrade modal', () => {
  const page = fs.readFileSync(new URL('../research/page.tsx', import.meta.url), 'utf8');
  const modal = fs.readFileSync(new URL('../Components/billing/UpgradeModal.tsx', import.meta.url), 'utf8');

  it('opens the context sheet only for truncation, and capacity for pipeline upgrade', () => {
    assert.match(page, /contextWallFromStreamEvent/);
    assert.match(page, /upgradeReason/);
    assert.match(page, /openWallUpgrade/);
    assert.match(page, /quoteFreeContextLimit/);
    assert.doesNotMatch(page, /20,?000|20k/);
    assert.match(page, /softFail/);
    assert.match(page, />\s*Retry\s*</);
    assert.match(page, />\s*Upgrade\s*</);
    assert.match(modal, /CONTEXT_UPGRADE_COPY/);
    assert.match(modal, /CAPACITY_UPGRADE_COPY/);
    assert.match(modal, /contextUpgradeBody/);
    assert.match(page, /quoteFreeContextLimit/);
    assert.match(modal, /Not now/);
    assert.match(modal, /View plans/);
    assert.doesNotMatch(page, /reason:\s*'context'/);
    assert.doesNotMatch(page, /fail_code|UPGRADE_REQUIRED/);
  });
});
