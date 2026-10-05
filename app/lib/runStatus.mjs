// Plain-language status lines for stream events the chat used to ignore.

/** The agent is full and this run is waiting for a slot (`queued` event from Backend A). */
export function queueStatus(payload) {
  const pos = Number(payload?.position);
  const place = Number.isFinite(pos) && pos >= 1 ? Math.min(Math.floor(pos), 999) : null;
  if (place === null) return 'Waiting for a free agent slot…';
  if (place === 1) return payload?.priority ? 'Priority access: you are next…' : 'You are next in line…';
  return `The agent is busy: you are #${place} in line…`;
}

/** What a memory_recall call is doing, or null for any other tool. */
export function memoryToolStatus(name, args) {
  if (name !== 'memory_recall') return null;
  const mode = String(args?.mode || (args?.exact ? 'exact' : 'search')).toLowerCase();
  if (mode === 'open') return 'Opening the original text…';
  if (mode === 'exact') return 'Searching your stored notes for exact words…';
  return 'Searching your stored notes…';
}
