import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeSource } from './memorySourceRow.mjs';

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
