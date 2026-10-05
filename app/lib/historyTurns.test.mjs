import test from 'node:test';
import assert from 'node:assert/strict';
import { historyTurns } from './historyTurns.mjs';

test('keeps user and assistant turns with text', () => {
  const out = historyTurns([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]);
  assert.deepEqual(out, [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]);
});

test('drops an assistant turn that has no answer text but keeps the question before it', () => {
  const out = historyTurns([{ role: 'user', content: 'q' }, { role: 'assistant', content: '' }, { role: 'assistant', content: '  ' }, { role: 'user', content: 'again' }]);
  assert.deepEqual(out, [{ role: 'user', content: 'q' }, { role: 'user', content: 'again' }]);
});

test('keeps an empty user turn and ignores other roles and bad input', () => {
  assert.deepEqual(historyTurns([{ role: 'user' }, { role: 'system', content: 'x' }, null]), [{ role: 'user', content: '' }]);
  assert.deepEqual(historyTurns(undefined), []);
});
