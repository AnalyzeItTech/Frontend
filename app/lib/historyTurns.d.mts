export function historyTurns(
  messages: Array<{ role: string; content?: string | null }> | null | undefined,
): Array<{ role: 'user' | 'assistant'; content: string }>;
