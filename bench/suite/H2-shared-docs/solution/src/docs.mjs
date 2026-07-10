// Reference: in-memory shared-document store. Owner has full rights; shares are 'view' | 'edit'.
// view  -> read only;  edit -> read + update (NOT delete, NOT share);  owner -> everything.
let seq = 0;
const store = new Map(); // id -> { id, owner, title, body, shares: Map<user,'view'|'edit'> }
const nes = (s) => typeof s === 'string' && s.trim() !== '';
const pub = (d) => ({ id: d.id, owner: d.owner, title: d.title, body: d.body });
const accessLevel = (d, user) => (d.owner === user ? 'owner' : (d.shares.get(user) || null));

export function createDoc(user, input) {
  if (!nes(input?.title)) return { ok: false, error: 'invalid' };
  const id = `doc-${++seq}`;
  const d = { id, owner: user, title: input.title, body: typeof input.body === 'string' ? input.body : '', shares: new Map() };
  store.set(id, d);
  return { ok: true, doc: pub(d) };
}

export function getDoc(user, id) {
  const d = store.get(id);
  if (!d) return { ok: false, error: 'not_found' };
  if (!accessLevel(d, user)) return { ok: false, error: 'forbidden' };
  return { ok: true, doc: pub(d) };
}

export function updateDoc(user, id, input) {
  const d = store.get(id);
  if (!d) return { ok: false, error: 'not_found' };
  const a = accessLevel(d, user);
  if (a !== 'owner' && a !== 'edit') return { ok: false, error: 'forbidden' }; // view-shared / none -> forbidden
  if (input && 'title' in input) {
    if (!nes(input.title)) return { ok: false, error: 'invalid' };
    d.title = input.title;
  }
  if (input && 'body' in input && typeof input.body === 'string') d.body = input.body;
  return { ok: true, doc: pub(d) };
}

export function deleteDoc(user, id) {
  const d = store.get(id);
  if (!d) return { ok: false, error: 'not_found' };
  if (d.owner !== user) return { ok: false, error: 'forbidden' }; // OWNER ONLY (even edit-shared cannot delete)
  store.delete(id);
  return { ok: true, doc: pub(d) };
}

export function shareDoc(user, id, targetUser, level) {
  const d = store.get(id);
  if (!d) return { ok: false, error: 'not_found' };
  if (d.owner !== user) return { ok: false, error: 'forbidden' };       // OWNER ONLY may share
  if (level !== 'view' && level !== 'edit') return { ok: false, error: 'invalid' };
  if (targetUser === user) return { ok: false, error: 'invalid' };      // cannot share with self
  d.shares.set(targetUser, level);
  return { ok: true, doc: pub(d) };
}

export function listDocs(user) {
  const docs = [];
  for (const d of store.values()) if (d.owner === user || d.shares.has(user)) docs.push(pub(d));
  return { ok: true, docs };
}
