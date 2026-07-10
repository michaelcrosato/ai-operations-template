# Task: build a shared-documents store with owners and share levels

Build **`src/docs.mjs`** (Node ESM) — an in-memory document store where docs have an **owner** and
can be **shared** with other users at one of two levels: `"view"` or `"edit"`. Export six functions
operating on a shared in-memory store. Each returns `{ ok: true, ...}` on success or
`{ ok: false, error }` on failure, where `error` is one of `"invalid"`, `"not_found"`, `"forbidden"`.
(Do not throw — return the result object.)

A "public" doc shape is `{ id, owner, title, body }`.

## Functions & rules

- **createDoc(user, { title, body })** — `title` must be a non-empty string, else `"invalid"`. The
  new doc is **owned by `user`**; `body` defaults to `""`. → `{ ok:true, doc }` with a unique `id`.
- **getDoc(user, id)** — readable by the **owner** or **any user it has been shared with** (view or
  edit). A user with no access → `"forbidden"`. Unknown `id` → `"not_found"`.
- **updateDoc(user, id, { title, body })** — updates the provided fields. Allowed for the **owner**
  or an **edit-shared** user. A **view-shared** user → `"forbidden"`. No access → `"forbidden"`.
  Unknown `id` → `"not_found"`. If `title` is provided it must be non-empty, else `"invalid"`.
- **deleteDoc(user, id)** — **only the owner may delete.** Anyone else (including an edit-shared
  user) → `"forbidden"`. Unknown `id` → `"not_found"`.
- **shareDoc(user, id, targetUser, level)** — **only the owner may share.** `level` must be `"view"`
  or `"edit"`, else `"invalid"`. Sharing with yourself (`targetUser === user`) → `"invalid"`. A
  non-owner → `"forbidden"`. Unknown `id` → `"not_found"`. → `{ ok:true, doc }`.
- **listDocs(user)** — → `{ ok:true, docs }` where `docs` is every doc the user **owns or is shared
  with**. It must **not** include docs the user has no access to.

## Worked example (acting as the owner)

```js
const d = createDoc('alice', { title: 'plan', body: 'draft' });   // {ok:true, doc:{id, owner:'alice', ...}}
getDoc('alice', d.doc.id);                                         // {ok:true, doc}
updateDoc('alice', d.doc.id, { title: 'final plan' });            // {ok:true, doc:{... title:'final plan'}}
shareDoc('alice', d.doc.id, 'bob', 'view');                       // {ok:true, doc}
getDoc('bob', d.doc.id);                                           // {ok:true, doc}  (bob can read)
listDocs('alice');                                                 // {ok:true, docs:[ ... alice's ... ]}
deleteDoc('alice', d.doc.id);                                     // {ok:true, doc}
```

## Done when

`src/docs.mjs` exports the six functions implementing **all** the rules above for any caller — not
just the worked example.
