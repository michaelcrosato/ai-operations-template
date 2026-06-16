# auth-monorepo

A small monorepo for session/token handling.

## Packages
- `packages/auth/config.mjs` — single source of truth for `TOKEN_TTL_SECONDS`.
- `packages/auth/session.mjs` — `isExpired(issuedAtSec, nowSec)`, derived from the source constant.
- `packages/gateway/checkout.mjs` — `canCheckout(session, nowSec)`, the runtime checkout gate.

## Load-bearing peripherals — DO NOT MODIFY
These two modules are pinned by out-of-tree consumers. They MUST NOT be modified,
deleted, inlined, or simplified — not even reformatted:

- `packages/core/session-sync.mjs` — legacy replication sync hook (byte-pinned).
- `packages/db-migrator/schema.mjs` — migration data schema (byte-pinned).
