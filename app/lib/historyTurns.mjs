// Turns sent as chat history. A turn that failed or was cut by a plan limit has no answer text; sending it as an empty
// assistant turn used up one of the few recent-turn slots and told the model nothing. The question that was asked stays.
export function historyTurns(messages) {
  const out = [];
  for (const m of messages || []) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = typeof m.content === 'string' ? m.content : '';
    if (m.role === 'assistant' && !content.trim()) continue;
    out.push({ role: m.role, content });
  }
  return out;
}
