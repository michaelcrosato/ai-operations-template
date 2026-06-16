// Reference solution: in-memory notes store with per-user ownership.
// READ is open to any user; UPDATE/DELETE are owner-only (the crux the headroom task measures).
let seq = 0;
const store = new Map();

const isNonEmptyString = (s) => typeof s === 'string' && s.trim() !== '';

export function createNote(user, input) {
  const title = input?.title;
  if (!isNonEmptyString(title)) return { ok: false, error: 'invalid' };
  const id = `note-${++seq}`;
  const note = { id, owner: user, title, body: typeof input.body === 'string' ? input.body : '' };
  store.set(id, note);
  return { ok: true, note: { ...note } };
}

export function getNote(user, id) {
  const note = store.get(id);
  if (!note) return { ok: false, error: 'not_found' };
  return { ok: true, note: { ...note } };
}

export function updateNote(user, id, input) {
  const note = store.get(id);
  if (!note) return { ok: false, error: 'not_found' };          // existence
  if (note.owner !== user) return { ok: false, error: 'forbidden' }; // ownership (the crux)
  if (input && 'title' in input) {
    if (!isNonEmptyString(input.title)) return { ok: false, error: 'invalid' };
    note.title = input.title;
  }
  if (input && 'body' in input && typeof input.body === 'string') note.body = input.body;
  return { ok: true, note: { ...note } };
}

export function deleteNote(user, id) {
  const note = store.get(id);
  if (!note) return { ok: false, error: 'not_found' };
  if (note.owner !== user) return { ok: false, error: 'forbidden' }; // ownership (the crux)
  store.delete(id);
  return { ok: true, note: { ...note } };
}
