import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { memoryToolStatus, queueStatus } from './runStatus.mjs';

describe('queueStatus', () => {
  it('says where you are in line', () => {
    assert.equal(queueStatus({ position: 4, priority: false }), 'The agent is busy: you are #4 in line…');
    assert.equal(queueStatus({ position: 1 }), 'You are next in line…');
  });
  it('tells a priority user they are next', () => {
    assert.equal(queueStatus({ position: 1, priority: true }), 'Priority access: you are next…');
  });
  it('tolerates a missing, junk or huge position', () => {
    assert.equal(queueStatus({}), 'Waiting for a free agent slot…');
    assert.equal(queueStatus(undefined), 'Waiting for a free agent slot…');
    assert.equal(queueStatus({ position: 'x' }), 'Waiting for a free agent slot…');
    assert.equal(queueStatus({ position: 0 }), 'Waiting for a free agent slot…');
    assert.match(queueStatus({ position: 1e9 }), /#999 /);
  });
});

describe('memoryToolStatus', () => {
  it('describes each memory_recall mode', () => {
    assert.equal(memoryToolStatus('memory_recall', {}), 'Searching your stored notes…');
    assert.equal(memoryToolStatus('memory_recall', { mode: 'exact' }), 'Searching your stored notes for exact words…');
    assert.equal(memoryToolStatus('memory_recall', { exact: true }), 'Searching your stored notes for exact words…');
    assert.equal(memoryToolStatus('memory_recall', { mode: 'open', source_id: 's', entry_id: 'c1' }), 'Opening the original text…');
  });
  it('leaves every other tool alone', () => {
    assert.equal(memoryToolStatus('object_query', { api_name: 'charge' }), null);
    assert.equal(memoryToolStatus('web_search', undefined), null);
  });
});
