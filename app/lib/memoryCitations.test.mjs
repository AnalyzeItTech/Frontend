import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_CITATIONS, normalizeMemorySources } from './memoryCitations.mjs';

const item = (over = {}) => ({ source_id: 's1', entry_id: 'c1', label: 'Uploaded file · 4 Oct 2026', excerpt: 'Kestrel-9 pump fault ZK-7741', opened: false, ...over });

describe('normalizeMemorySources', () => {
  it('keeps a well-formed citation', () => {
    assert.deepEqual(normalizeMemorySources([item()]), [{ key: 's1:c1', label: 'Uploaded file · 4 Oct 2026', excerpt: 'Kestrel-9 pump fault ZK-7741', opened: false }]);
  });
  it('puts passages the agent read in full first', () => {
    const got = normalizeMemorySources([item({ entry_id: 'a' }), item({ entry_id: 'b', opened: true })]);
    assert.deepEqual(got.map((g) => g.key), ['s1:b', 's1:a']);
  });
  it('drops duplicates, junk and items with no source', () => {
    const got = normalizeMemorySources([item(), item(), null, 'x', 7, { entry_id: 'c9' }, { source_id: '   ' }]);
    assert.equal(got.length, 1);
  });
  it('falls back to a plain label and tidies the excerpt', () => {
    const [g] = normalizeMemorySources([item({ label: '  ', excerpt: 'a   long\n\n text ' + 'x'.repeat(400) })]);
    assert.equal(g.label, 'Stored note');
    assert.ok(g.excerpt.length <= 300 && g.excerpt.endsWith('…') && !g.excerpt.includes('\n'));
  });
  it('caps the number of chips and tolerates non-arrays', () => {
    const many = Array.from({ length: 20 }, (_, i) => item({ source_id: `s${i}` }));
    assert.equal(normalizeMemorySources(many).length, MAX_CITATIONS);
    for (const bad of [undefined, null, 'x', {}, 3]) assert.deepEqual(normalizeMemorySources(bad), []);
  });
});
