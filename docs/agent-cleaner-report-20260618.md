# agent-cleaner report — 2026-06-18

**Target repo:** `ai-operations-template` (the AI operations engine)
**Branch:** `chore/agent-cleaner-20260618` (off `origin/develop` @ `62b391b`)
**Mode:** **QUICK** — small repo (engine template + a tiny `src/oneshot/`); one coherent pass.
**Canonical gate:** `bash scripts/verify.sh` (typecheck + Biome lint + `node:test` + features.json
state-validate + model-policy drift + assertion-shield + engine Biome lint + shellcheck +
**367** hook-contract tests + mutation-smoke).

## Headline

This repo was already at the standard. It is a mature, heavily-gated engine that had **just
been doc-reconciled** (base = PR #135). The audit found **one** safely-fixable item (a lint
warning) and **one** item that looks like a quick win but is not safe (the `"type"` field). All
other apparent "gaps" are **documented, deliberate engineering choices** and are recorded as
INTENTIONAL — not fixed. A clean report is the honest outcome here; this one is not padded.

| | Count |
|---|---|
| **FIXED** | 1 |
| **NEEDS DECISION** | 1 |
| **INTENTIONAL** (respected, not touched) | 7 |

- **Baseline gate:** `VERIFY: PASS (exit 0)` — 367 hook tests passed, all 5 mutants killed.
- **Final gate (committed tree):** `VERIFY: PASS (exit 0)` — 367 hook tests passed, all mutants killed.

---

## FIXED

### F1 — Biome lint warning `lint/complexity/useOptionalChain` in `src/oneshot/verdict.js`

- **Before:** the baseline lint step reported `Found 1 warning` (still `OK`, since warnings don't
  fail the gate). The Standard (§3 Linting) says warnings are *triaged, not ignored*.
- **Site:** `src/oneshot/verdict.js:48`
  - `const evidencePath = (options && options.evidencePath) ? … : defaultEvidencePath();`
  - → `const evidencePath = options?.evidencePath ? … : defaultEvidencePath();`
- **Why it is safe (behavior-preserving):** the expression is used purely as a ternary *condition*.
  `options && options.evidencePath` and `options?.evidencePath` differ only in their falsy *value*
  (`options` vs `undefined`) when `options` is nullish — and that value is never consumed here, only
  its truthiness. Both take the same branch for every input. (Biome labels the auto-fix "Unsafe"
  because it reasons about the general value-consuming case, not this condition-only use; the change
  was applied by hand, not via `--unsafe`.) Touches product code only — **not** a test assertion,
  **not** a guard surface, **not** `features.json`.
- **Verified by:** `bash scripts/verify.sh` → lint step now `──── lint: OK` with no warning;
  `367 passed, 0 failed`; mutation-smoke `OK`; `VERIFY: PASS (exit 0)`. The change is covered by the
  existing `src/oneshot/verdict.test.js` (AC1–AC5), which stayed green.

---

## NEEDS DECISION

### D1 — `MODULE_TYPELESS_PACKAGE_JSON` Node warning on every `ts-node` invocation

- **Symptom:** every `ts-node`-backed gate step (`update-state.ts --validate`,
  `check-model-policy.ts`, `assertion-shield.ts`) prints, to stderr:
  `(node:NNN) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of …/scripts/*.ts is not specified
  and it doesn't parse as CommonJS. Reparsing as ES module … This incurs a performance overhead.`
  because `package.json` has no `"type"` field.
- **It is cosmetic, NOT gating:** every step still reports `OK`; the warning has never affected the
  gate outcome. It is stderr noise plus a small per-call reparse cost.
- **The "obvious" fix was tested and it BREAKS the gate.** Adding `"type": "commonjs"` (the honest
  declaration — the repo *is* CommonJS per DECISIONS.md 2026-06-10, which is also why
  `noRedundantUseStrict` is disabled in `biome.json`) silences the warning but **fails the gate**:
  `bash scripts/verify.sh` → **hook contract tests: 282 passed, 85 failed**, `check-model-policy.ts`
  F-MP1 cases flip, and **mutation-smoke errors** (`an update-state killer is not green on unmutated
  code`). Change reverted immediately; gate re-confirmed `VERIFY: PASS (exit 0)`.
- **Root cause (why it breaks):** the hook-contract suite (`scripts/test-hooks.sh`) creates its
  throwaway fixtures *inside the repo tree* via `mktemp -d "tmp/hook-tests-XXXXXX"` (relative path,
  line 13). Those fixture dirs and the `ts-node`/`node` children spawned against them inherit the
  repo-root `package.json` through Node's upward `package.json` lookup. A root `"type"` field changes
  how those dynamically-written `.ts`/`.json` fixtures are interpreted as modules, which is exactly
  what 85 of the contract tests and the mutation killers depend on. The coupling is real and
  repo-specific; it is not a one-line config flip.
- **Options:**
  1. **Leave it (recommended for now).** Accept the cosmetic warning. Zero risk; the gate stays green.
     It is stderr-only and does not reach the operator.
  2. **Suppress at the source without a root `"type"`:** run the `ts-node` steps with
     `NODE_OPTIONS=--no-warnings` or `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON` *scoped to
     those three steps* in `verify.sh`. Pro: silences noise, no module-resolution change. Con: edits
     `verify.sh`, a Tier-C gate surface → must go through a security-reviewed cycle (out of scope for
     this pass); also risks masking *other* future warnings if applied too broadly.
  3. **Set `"type": "commonjs"` AND make the hook tests' fixtures hermetic** — e.g. have
     `test-hooks.sh` write a `package.json` (with the matching `"type"`, or none) into each `mktemp`
     fixture dir, or relocate fixtures to a true OS temp dir outside the repo so they don't inherit the
     root field. This is the "correct" fix but it is a non-trivial change to the test harness that
     guards the engine, so it needs a deliberate, reviewed feature — **not** a cleanup-pass edit.
- **Recommendation:** Option 1 now; if the noise is worth removing, groom Option 3 as a small feature
  (it also hardens fixture hermeticity, which is independently good). Either way this is a guard/gate
  surface and belongs in a normal `/work` cycle with the evaluator, not in this pass.

---

## INTENTIONAL (respected and recorded — deliberately NOT changed)

Each of these is documented as a deliberate choice; the prompt's constraints reinforce them. They
are *not* gaps.

1. **Auto-format is OFF (lint-only by design).** `biome.json` has `"formatter": { "enabled": false }`.
   Documented: README "Honest limitations" ("Code formatting is not enforced") and DECISIONS.md
   2026-06-16 cycle-2. The Standard's §2 Formatting default (introduce a formatter) is explicitly
   *not* applied because the repo is opinionated against it ("spends its gate budget on correctness").
   **No formatter or `format --check` gate was added.**

2. **No external secret scanner (gitleaks/trufflehog/etc.).** The repo enforces the secrets boundary
   with its *own* guard hooks — `guard-bash.sh` (denies `.env` reads and exfil-shaped uploads),
   `path-guard.js`, `verify-gate.sh`, `assertion-shield.ts`. This was confirmed live: a `grep` whose
   pattern literally contained the dotenv string was **BLOCKED by `guard-bash.sh`** mid-audit — the
   guard works as designed. **No external scanner was added.** Manual check: no secret-shaped files are
   tracked (`git ls-files` for `*.pem`/`*.key`/credential/dotenv patterns → none).

3. **`develop` is the default branch; `main` is protected.** Documented and intentional; the working
   branch was cut off `origin/develop` and no commit touches `main`/`master`.

4. **Avoid-list (DECISIONS.md 2026-06-10, "§J", standing policy).** Bans observability platforms,
   vector-DB/RAG, graph/DAG frameworks, monorepo release machinery, telemetry-by-default, docs sites,
   auto-merge/deploy, and extra-tooling-by-default. **No such tooling was added or proposed.**

5. **`roadmap/features.json` is writable only via `scripts/update-state.ts`** (a hook blocks
   hand-edits; `passes:true` requires a real green `verify.log` on disk). **Never edited.**

6. **Test assertions are never deleted or weakened** (assertion-shield blocks it; the engine's value
   is teeth-y tests). The one FIXED edit is in non-test product source and was confirmed not to trip
   the shield. **No assertion touched.**

7. **`.claude/**` hooks/guards and `.github/workflows/**` are Tier-C guard/CI surfaces** — out of
   scope for a cleanup pass. **Not modified.** (D1 Option 2/3 above, which would touch `verify.sh` or
   `test-hooks.sh`, is therefore flagged as NEEDS DECISION rather than done here.)

---

## Docs ↔ reality reconciliation

- **README quickstart commands all exist:**
  - `scripts/install-into.sh` ✅
  - `scripts/init.sh` ✅
  - `scripts/verify.sh` ✅ (and runs green)
- **`package.json` scripts** referenced by the docs/gate (`lint`, `typecheck`, `test`, `verify`,
  `state`, `state:validate`, `shield`) all exist and resolve.
- No references to deleted modules were found. The README's documented status ("367 hook-contract
  tests", "`VERIFY: PASS`", `src/oneshot/` MVP, formatter-off) matches the live tree and the
  green gate run. The repo was reconciled in PR #135 immediately before this pass; this audit found
  the docs already consistent with reality.

## Repo hygiene / deps / git (spot-check)

- **Secrets:** none tracked; enforced by the repo's own guards (INTENTIONAL §2).
- **Artifacts:** build/cache/report dirs (`.next/`, `playwright-report/`, `test-results/`, `tmp/`,
  `*.tsbuildinfo`, `node_modules/`) are all **gitignored**; the working tree was clean at start.
- **Lockfile:** `package-lock.json` committed and consistent.
- **Dependencies:** `npm audit --omit=dev --audit-level=high` → **found 0 vulnerabilities**.
- **No untracked TODO/FIXME/HACK debt** in `scripts/`, `src/`, `.claude/hooks/` (the only matches are
  `F-XXXX` / `mktemp -XXXXXX` placeholders in comments and usage strings — false positives).
- **Largest tracked files** are all legitimate state docs (`roadmap/*` history, `test-hooks.sh`).
- **Git:** work on `chore/agent-cleaner-20260618`; clean tree at end; no force-push, no hard-reset,
  no history rewrite; `main`/`master` untouched.

## Tooling

- **Detected, none installed or migrated** (per the explicit Phase-2 constraint). Stack: Node 24,
  `@biomejs/biome` (lint), `ts-node`/TypeScript, `node:test`, `shellcheck` (npm wrapper).
- **Agent-environment note:** the local `bash` here is **Cygwin** (`5.3.9 … x86_64-pc-cygwin`), not
  Git Bash. `bash scripts/verify.sh` nonetheless ran fully green via `scripts/local-cli-preflight.sh`
  + `$BASH`. (CLAUDE.md/README note Git Bash as the supported local shell; this run is evidence the
  gate also passes under Cygwin bash on this box. Not a defect — recorded for reproducibility.)

## Effort ledger

| Phase | Work | Notes |
|---|---|---|
| 0 Safety | fetch develop, branch off `62b391b`, confirm clean tree | 1 branch cut |
| 1 Measure | read contracts + README + DECISIONS; baseline gate ×1 | QUICK chosen (small repo) |
| 2 Tooling | detect-only | nothing installed/migrated |
| 3 Plan | collapsed to single pass (QUICK) | no `.agent-cleaner/` workdir needed |
| 4–5 Execute/Verify | apply lint fix; test `"type"` candidate → revert; gate re-runs ×3 | 1 FIXED, 1 NEEDS DECISION |
| 6 Report | this file | — |

**Re-verify command:** `bash scripts/verify.sh` (expect `VERIFY: PASS (exit 0)`, `367 passed`).
