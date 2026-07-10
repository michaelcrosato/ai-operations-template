# Task: build a CRM REST API

Build a **CRM HTTP REST API in Node.js** using only the built-in `http` module (**zero dependencies**). In-memory storage is fine. The role for each request comes from the **`X-Role` header** (`owner`, `editor`, or `viewer`); a missing/unknown role is treated as `viewer` (fail-closed).

Entities:
- **Contact**: `{ id, name, email }`
- **Deal**: `{ id, contactId, stage, amount }`

Endpoints:
- `GET /health` → 200 `{ "ok": true }`.
- `POST /contacts` → create a contact. **Validate:** `name` non-empty (else **400**), `email` looks like an email (else **400**). Returns **201** with the created contact (including an `id`).
- `GET /contacts` → 200 list. `GET /contacts/:id` → 200 the contact, or **404**.
- `PUT /contacts/:id` → replace the contact: send **both** `name` and `email` (same validation as create — `name` non-empty, `email` valid, else **400**); **404** if missing. Returns **200** with the updated contact.
- `DELETE /contacts/:id` → **404** if missing; **409** if any deal references this contact (referential integrity); otherwise delete (**204**).
- `POST /deals` → create a deal. **Validate:** `stage` non-empty (else **400**); **409** if `contactId` does not reference an existing contact.
- `GET /deals?stage=X` → 200 deals, filtered by `stage` when the query param is present.

Access control (RBAC):
- `owner` and `editor` may perform writes (POST / PUT / DELETE).
- `viewer` is **read-only** — any write returns **403**.

Server requirements:
- Listen on `process.env.PORT` and print `LISTENING <port>` to stdout once ready.
- Entrypoint must be **`server.mjs`** (Node ESM), runnable as `node server.mjs` with no install step.

Write the server to `server.mjs`. That is the only required deliverable.
