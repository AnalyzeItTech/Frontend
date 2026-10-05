import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeSource, relativeTime, searchLine, usageLine } from './memorySourceRow.mjs';

describe('describeSource', () => {
  it('leads with the file name and says what it is', () => {
    const d = describeSource({ title: 'Q3 plan.pdf', kind_label: 'Uploaded file', tokens: 14985, created_at: '2026-10-04T10:00:00Z', pinned: false });
    assert.equal(d.heading, 'Q3 plan.pdf');
    assert.equal(d.detail, 'Uploaded file · 14,985 tokens · 4 Oct 2026');
  });
  it('falls back to the kind when there is no name, without repeating it', () => {
    const d = describeSource({ title: null, kind_label: 'Past conversation', tokens: 120, created_at: '2026-01-02T00:00:00Z', pinned: true });
    assert.equal(d.heading, 'Past conversation');
    assert.equal(d.detail, '120 tokens · 2 Jan 2026 · pinned');
  });
  it('tolerates missing or junk fields', () => {
    assert.deepEqual(describeSource({}), { heading: 'Stored note', detail: '0 tokens' });
    assert.deepEqual(describeSource({ title: '   ', tokens: NaN, created_at: 'not a date' }), { heading: 'Stored note', detail: '0 tokens' });
    assert.equal(describeSource(null).heading, 'Stored note');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  it('reads naturally', () => {
    assert.equal(relativeTime('2026-10-05T11:59:40Z', now), 'just now');
    assert.equal(relativeTime('2026-10-05T11:55:00Z', now), '5 minutes ago');
    assert.equal(relativeTime('2026-10-05T11:00:00Z', now), '1 hour ago');
    assert.equal(relativeTime('2026-10-02T12:00:00Z', now), '3 days ago');
    assert.equal(relativeTime('2026-07-05T12:00:00Z', now), '3 months ago');
    assert.equal(relativeTime('2024-10-05T12:00:00Z', now), '2 years ago');
  });
  it('is empty for junk and never negative', () => {
    assert.equal(relativeTime(null, now), '');
    assert.equal(relativeTime('nope', now), '');
    assert.equal(relativeTime('2026-10-06T12:00:00Z', now), 'just now');
  });
});

describe('usageLine and searchLine', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  it('says how much a source is used', () => {
    assert.equal(usageLine({ cite_count: 0 }, now), 'Not used in an answer yet');
    assert.equal(usageLine({}, now), 'Not used in an answer yet');
    assert.equal(usageLine({ cite_count: 1, last_cited_at: '2026-10-04T12:00:00Z' }, now), 'Used in 1 answer · last 1 day ago');
    assert.equal(usageLine({ cite_count: 4, last_cited_at: null }, now), 'Used in 4 answers');
  });
  it('describes searchability honestly', () => {
    assert.match(searchLine('full'), /Every passage/);
    assert.match(searchLine('summary'), /summary and exact words/);
    assert.equal(searchLine(null), '');
    assert.equal(searchLine('full', 'writing'), 'Still being processed');
  });
});
