# Evidence note — fix/shield-chai-assertions

**Change:** add chai/must.js `.should`/`.must` method-call forms (+ spaced `expect `) to
`assertionKeywords` in `scripts/assertion-shield.ts`, plus two hook-contract tests in
`scripts/test-hooks.sh`. Closes a pre-existing coverage gap (3-reviewer pass, PR #119,
byte-identical on develop): a test asserting only via a chai `.should`/`.must` chain
carried no `expect(`, so its assertion line could be deleted while the wrapper stayed
and the shield passed (silent fail-open).

## verify.sh result (see verify.log)

Every gate that exercises this change is GREEN:

- **assertion shield: OK** — run on the actual branch diff; this change deletes no test assertions.
- **hook contract tests: 352 passed, 0 failed** — incl. the two new tests:
  - `shield chai: deleting a .should assertion line is BLOCKED (exit 1)`
  - `shield chai: deleting a non-assertion line (assertion kept) PASSES (exit 0)`
- **mutation smoke: OK** — the assertion-shield deletion-detection mutant is still killed.
- **engine lint (biome): OK** · **shellcheck (hooks + gate scripts): OK** · **model-policy: OK**
  · **features.json schema + invariants: OK** · **lint: OK** · **unit tests: 52 pass**.

## Why `typecheck` and `build` are RED locally (environmental — NOT this change)

This branch is cut from `origin/develop`, which still carries the **full ForgeOps demo**
(`src/forge/`, `app/`, `components/`, `e2e/`, `next.config.ts`, `playwright.config.ts`) —
the ForgeOps purge is on the separate, not-yet-merged PR #119. The local `node_modules`,
however, is the **post-purge slimmed set** (the session began on the purge branch), so
`react`, `next`, `framer-motion`, `@playwright/test`, etc. are not installed.

Consequently `tsc --noEmit` and `next build` fail with `Cannot find module 'react'/'next'/
'@playwright/test'` errors — **every one of them in files this change never touches**
(`components/ui/*.tsx`, `e2e/*.spec.ts`, `*.config.ts`). A string-array edit and a shell
test cannot affect npm module resolution.

CI runs the identical `scripts/verify.sh` after a fresh install of develop's full
`package.json`, so `react`/`next`/Playwright are present and these two gates run green
there (as they do on develop today). Reinstalling the demo deps locally — to typecheck and
build code PR #119 is about to delete — was deliberately skipped as make-work.
