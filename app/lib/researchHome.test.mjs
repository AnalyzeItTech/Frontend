/**
 * Research home empty state and composer mode control.
 * Run: node --test app/lib/researchHome.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  COMPOSER_SEGMENTS,
  GLOBE_SIGN_IN_LINE,
  RESEARCH_EMPTY_SUB,
  RESEARCH_EMPTY_TITLE,
  globeSegmentResult,
  moveComposerSegment,
} from './composerMode.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('research empty copy', () => {
  it('is one plain line without internal jargon', () => {
    assert.equal(RESEARCH_EMPTY_TITLE, 'Ask what your data already knows');
    assert.equal(RESEARCH_EMPTY_SUB.includes('\n'), false);
    assert.match(RESEARCH_EMPTY_SUB, /quiet/i);
    const copy = `${RESEARCH_EMPTY_TITLE} ${RESEARCH_EMPTY_SUB}`;
    assert.equal(/\b(RLM|CSR|Azure)\b/i.test(copy), false);
  });
});

describe('composer mode keyboard', () => {
  it('moves between Chat, Research, and Globe', () => {
    assert.deepEqual(COMPOSER_SEGMENTS, ['chat', 'research', 'globe']);
    assert.equal(moveComposerSegment(0, 'ArrowRight'), 1);
    assert.equal(moveComposerSegment(1, 'ArrowDown'), 2);
    assert.equal(moveComposerSegment(2, 'ArrowRight'), 0);
    assert.equal(moveComposerSegment(0, 'ArrowLeft'), 2);
    assert.equal(moveComposerSegment(2, 'ArrowUp'), 1);
    assert.equal(moveComposerSegment(1, 'Home'), 0);
    assert.equal(moveComposerSegment(0, 'End'), 2);
    assert.equal(moveComposerSegment(1, 'Enter'), null);
    assert.equal(moveComposerSegment(1, ' '), null);
  });
});

describe('globe segment', () => {
  it('opens /globe when signed in and asks to sign in when gated', () => {
    assert.deepEqual(globeSegmentResult(true), { kind: 'navigate', href: '/globe' });
    assert.deepEqual(globeSegmentResult(false), { kind: 'gate', message: 'Sign in to use Globe' });
    assert.equal(GLOBE_SIGN_IN_LINE, 'Sign in to use Globe');
  });
});

describe('research page wiring', () => {
  it('keeps the send path and mounts the empty state and mode control', () => {
    const page = read('app/research/page.tsx');
    assert.match(page, /researchMode: mode === 'research'/);
    assert.match(page, /do not prepend "\[Research mode\]/);
    assert.match(page, /<ResearchEmptyState/);
    assert.match(page, /<ComposerModeControl/);
    assert.equal(page.includes('Hi {firstName}'), false);

    const empty = read('app/Components/research/ResearchEmptyState.tsx');
    assert.match(empty, /font-serif/);
    assert.match(empty, /max-w-\[28rem\]/);
    assert.match(empty, /RESEARCH_EMPTY_TITLE/);
    assert.match(empty, /RESEARCH_EMPTY_SUB/);
    assert.match(empty, /research-prompt-chip/);
    assert.equal(/\b(RLM|CSR|Azure)\b/.test(empty), false);

    const control = read('app/Components/research/ComposerModeControl.tsx');
    assert.match(control, /role="tablist"/);
    assert.match(control, /aria-selected/);
    assert.match(control, /aria-orientation="horizontal"/);
    assert.match(control, /moveComposerSegment/);
    assert.match(control, /GLOBE_SIGN_IN_LINE/);
    assert.match(control, /href="\/globe"/);
  });
});
