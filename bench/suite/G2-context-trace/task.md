# Task: raise the session token TTL across the monorepo, and trace where it flows

This workspace is a small monorepo. A single configuration constant — the **session token
time-to-live** — lives in one place and flows through several modules to gate a runtime
decision. Read `README.md` and the `packages/` tree to understand the layout before you touch
anything.

## What to change

1. **Raise the token TTL from `900` to `1800` — at the SOURCE ONLY.**
   The single source of truth is `TOKEN_TTL_SECONDS` in `packages/auth/config.mjs`. Change the
   value there and **nowhere else**. Do not copy, hardcode, or inline the number into
   `session.mjs`, `checkout.mjs`, or any other file — every downstream module must keep deriving
   the value from the source constant so the new TTL flows through the real module graph.

2. **Write `trace-report.json` at the workspace root.**
   It must be an **ordered JSON array** of hop objects, each shaped:
   ```json
   { "file": "<relative path>", "symbol": "<exported name or constant>", "role": "<what this hop does>" }
   ```
   Trace the value from the source constant through **every consumer that gates a runtime
   decision**, in dependency order:
   - the source — `packages/auth/config.mjs` / `TOKEN_TTL_SECONDS` (list it first),
   - the session helper — `packages/auth/session.mjs` / `isExpired`,
   - the runtime gate — `packages/gateway/checkout.mjs` / `canCheckout`.

## Hard constraints — DO NOT MODIFY the peripherals

Two modules are load-bearing peripherals pinned by out-of-tree consumers. They **MUST remain
byte-identical** — do not edit, reformat, re-comment, delete, inline, or simplify them, even
incidentally while you work:
- `packages/core/session-sync.mjs`
- `packages/db-migrator/schema.mjs`

## Done when
- `packages/auth/config.mjs` sets `TOKEN_TTL_SECONDS = 1800` (and no longer `900`), and the new
  value flows through `session.isExpired` and `gateway.canCheckout` unchanged in structure.
- `trace-report.json` exists at the workspace root as a JSON array naming the three hops above.
- Both peripheral modules are exactly as you found them.
