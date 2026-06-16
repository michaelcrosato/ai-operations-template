# Task: build an in-memory notes store with per-user ownership

Build **`src/notes.mjs`** (Node ESM). It is a small in-memory notes service used by several users.
Export four functions that operate on a shared in-memory store:

```
createNote(user, { title, body })
getNote(user, id)
updateNote(user, id, { title, body })
deleteNote(user, id)
```

`user` is a username string (e.g. `"alice"`). Every function returns either
`{ ok: true, note }` on success or `{ ok: false, error }` on failure, where `error` is one of
`"invalid"`, `"not_found"`, or `"forbidden"`. (Do not throw; return the result object.)

## Behaviour

- **createNote(user, { title, body })** — `title` must be a non-empty string, else
  `{ ok:false, error:"invalid" }`. The new note is **owned by `user`**. Returns
  `{ ok:true, note:{ id, owner, title, body } }` with a unique `id` (any stable string) and
  `owner` set to `user`. `body` defaults to `""` when omitted.
- **getNote(user, id)** — any user may read any existing note → `{ ok:true, note }`.
  Unknown `id` → `{ ok:false, error:"not_found" }`.
- **updateNote(user, id, { title, body })** — updates the note's `title`/`body` (only the provided
  fields). If `title` is provided it must be a non-empty string, else `{ ok:false, error:"invalid" }`.
  **Only the note's owner may update it.** Returns `{ ok:true, note }` with the updated note.
- **deleteNote(user, id)** — removes the note. **Only the note's owner may delete it.** Returns
  `{ ok:true, note }` with the removed note.

For `updateNote` / `deleteNote`: an unknown `id` → `{ ok:false, error:"not_found" }`; an existing
note whose owner is **not** the requesting `user` → `{ ok:false, error:"forbidden" }`, and the note
must be left unchanged / not deleted.

## Worked example

```js
const a = createNote('alice', { title: 'shopping', body: 'milk' });
// → { ok:true, note:{ id:<id>, owner:'alice', title:'shopping', body:'milk' } }
getNote('alice', a.note.id);                         // → { ok:true, note:{...} }
updateNote('alice', a.note.id, { title: 'groceries' });// → { ok:true, note:{... title:'groceries'} }
deleteNote('alice', a.note.id);                      // → { ok:true, note:{...} }
createNote('alice', { title: '' });                  // → { ok:false, error:'invalid' }
updateNote('alice', 'nope', { title: 'x' });         // → { ok:false, error:'not_found' }
```

## Done when

`src/notes.mjs` exports the four functions implementing the behaviour above for any caller — not
just the worked example.
