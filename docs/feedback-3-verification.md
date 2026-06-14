# feedback-3 — Verification Report (5-source external review)

**Date:** 2026-06-14 · **Scope:** `develop` branch · **Method:** the 89 consolidated points from five independent engineering reviews were each checked against the **real repo files** (not the review text) by a multi-agent verification fleet plus direct inspection, then cross-referenced with the prior `feedback-2-verification.md` (2026-06-10) and live web research (`docs/ai-capabilities-research-2026-06.md`). Per the P1 rule, every claim was presumed wrong until the live tree confirmed it.

The 89 points were consolidated (deduped, cited) from five reviews — referred to here as Sources 1–5. The reviews contained known internal contradictions (e.g. `rbac.js` called both "correct" and "hollow"; the "ghost/blocked" feature named F-0017 by one source and F-0018 by another); both sides were preserved and adjudicated below.

## Bottom line

The strong reviews are **directionally right and the engine is genuinely well-built**, but a meaningful share of the sharpest accusations are either **already fixed**, **deliberate documented deferrals**, or **by-design** — exactly the pattern `feedback-2` found. Net of verification:

- **~52 points confirmed**, **0 outright refuted as false**, **~14 already fixed in the live tree**, the remainder by-design / deferred-by-documentation / operator-decision.
- **Implemented now** (this PR, gate green): the safe, high-confidence subset.
- **Enabled out-of-tree:** GitHub security posture.
- **Groomed as features** (F-0021/F-0022/F-0023): the two HIGH trust-failures + the research-supported model-currency fix.
- **Documented as recommended backlog:** the large/risky refactors (the constitution + the verified plan both say groom, never do casually).

## Implemented in this PR (verified, `bash scripts/verify.sh` → PASS, 190 hook tests)

1. **`.gitattributes` LF pinning** — `*.txt`/`*.log`/`Dockerfile`/`*.tsx`/`*.js`/`*.css` pinned to `eol=lf`. Confirmed live: checking out the branch surfaced `roadmap/evidence/F-0017/*` as "modified" with zero content change (pure CRLF↔LF churn under `core.autocrlf`); the fix clears it. (Sources 2, 5 — confirmed.)
2. **Path-scoped rules repointed to real dirs** — `security.md` → `src/forge/**`, `frontend.md` → `app/**` + `components/**`; dead targets (`src/api`, `src/auth`, `src/server`, `src/components`, `src/views`, `src/pages`) removed; `database.md` annotated forward-looking. Confirmed: all those dirs are absent, so the rules could never fire on real product code. (Source 5 — confirmed; minor detail correction: `security.md` actually targeted `src/server`, not `src/components`.)
3. **Public-repo governance pack** — `SECURITY.md` (private vuln reporting + dated scope), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/CODEOWNERS` (guardrail-path map), `.github/ISSUE_TEMPLATE/` (bug/feature/agent-failure + config). The public trigger has fired (`docs/optional-modules.md`); built to that spec. (Sources 2, 3 — confirmed/legit.)
4. **postcss advisory patched** — direct dep → `^8.5.10` + `overrides`, forcing Next's transitive copy up (installed 8.5.15). `npm audit --omit=dev --audit-level=moderate` → **0 vulnerabilities** (was CVE-2026-41305 / GHSA-qx2v-qp2m-jg93). (Source 2 — confirmed.)
5. **Honest product framing** — `package.json` description dropped "Premium Platform"/"Grok-powered"; `app/page.tsx` removed fabricated proof (fake customer logos "Acme Research • Linear Labs • Vercel • Notion AI • Replicate", "4,812 workflows shipped this week", "Facts verified live 2026-06-12", "realistic production data" → synthetic/demo wording) and the last "Grok-powered swarms" string → "multi-agent swarms". Copy/branding change made under `.claude/rules/frontend.md` decide-and-document. (Sources 1, 2, 3, 5 — confirmed.)
6. **`scripts/verify.ps1`** — canonical Windows entry point: locates Git Bash, refuses WSL `bash`, fails fast if `node` is missing, runs the gate. Confirmed live: Windows resolves `bash` to WSL first, where `node` is absent → the misleading 46-failure run; Git Bash passes. (Sources 1, 2, 3 — confirmed.)
7. **`verify-rules.ts` false-positive suppression** — it *was* still emitting both `npm run build`/`npm test` "missing" warnings on SessionStart (the earlier fix only covered the no-script case); now a CLAUDE.md that documents the custom gate (`scripts/verify.sh`) satisfies the expectation. Caveat to Source 4: the SessionStart hook runs it with `2>/dev/null`, so the agent never actually saw them — the impact was overstated, but the warnings were genuinely wrong. (Source 4 — confirmed-with-caveat.)
8. **`OPERATOR_GUIDE.md`** `<REPO_NAME>` placeholder filled; **`.gitignore`** ignores `.playwright-mcp/`.

## Enabled out-of-tree (GitHub repo settings, via API)

Dependabot/**vulnerability alerts**, **Dependabot security updates**, **secret scanning**, **secret-scanning push protection**, and **private vulnerability reporting** are now all **enabled** (were all disabled). This resolves the HIGH "GitHub security alerting disabled" finding. (Source 2 — confirmed, now fixed.) `dependabot.yml` (version-update PRs) already existed — the gap was the alert *settings*, not the config.

## Groomed as features (the necessary larger fixes go through the proper loop)

- **F-0021 (P1) — F-0018 visual-canvas RBAC enforcement + Playwright E2E + `rbac.js` role unification.** Confirmed HIGH trust-failure: F-0018 is `done/passes:true` but `app/demo/page.tsx` computes `canEdit` and never enforces it (edit controls lack gating; only `canIntervene` is wired), and the brief AC requires viewer mutations to be visibly rejected. `rbac.js` ignores its `_res` arg and only models owner/viewer. (Sources 2, 5 — confirmed.)
- **F-0022 (P1) — Arm the F-0007 path-authorization guard mechanically.** Confirmed: `CLAUDE_ACTIVE_FEATURE` is set **nowhere** in executable code (only requested in briefs), so `verify-gate.sh`/`path-guard.js` no-op and fail open in real sessions. Nuance from `feedback-2`: the evaluator already diffs changed files against `authorized_paths`, so path discipline is **not** purely prompt-obedience — but the "mechanically protected" claim overstates the live guard. Fix or honestly scope. (Source 5 — confirmed; framing tempered.)
- **F-0023 (P2) — Product model-currency + single product model registry.** Confirmed: `grok-3`/`grok-4` hardcoded in ~57 places across 5 files incl. forge logic (`promptToGraph.js`/`abSim.js`/`exportArtifacts.js` default nodes to `model:'grok-4'`); `grok-4` is verified **stale** (current `grok-4.3`). Deferred to a feature because it regenerates committed audit evidence and deserves the evaluator byte-match. **Engine `.claude/model-policy.json` is already correct (tier aliases) and must not change.** (Sources 1, 3, 5 + research — confirmed.)

The backlog now reads **23 features, 20 passing** — honestly reflecting that not everything is truly done (correcting the "all 20 passing" overstatement Sources 2/3/5 flagged).

## Recommended backlog (verified-legit, not yet groomed — groom via `/groom` or operator priority)

- **`src/forge` CJS→TS migration** so the core is covered by `tsc --noEmit` and the frontend imports one `promptToGraph` instead of the duplicate string-matcher in `lib/seed.ts`. (Sources 1, 3, 5.)
- **`app/demo/page.tsx` decomposition** (~1,731 lines, 28 `useState`, 31 `any`) into hooks + panels; pairs with F-0021. (Sources 1, 2, 4.)
- **Test side-effect isolation** — move root-scope `fs.writeFileSync` out of `*.test.js` module load + add a "verify leaves the worktree clean" gate. (The cross-file abSim race is **already fixed**, commits ce30f2f/a521cce — Source 1/2 partly stale here.) (Sources 1, 2, 5.)
- **Behavioral product tests** (prompt with "research" ⇒ a `research` node; A/B variants differ) replacing tautologies; **metrics backfill** for F-0017/F-0019 + a `--validate` invariant that every done feature has a metrics record; **glob-matcher dedup** (`verify-gate.sh` Node+bash + `path-guard.js` regex → one impl or a shared agreement test); **portable `scripts/run-tests.js`** to retire the hand-maintained test-file list; **remove unused runtime deps** (`cmdk`/`date-fns`/`react-hook-form`/`zod` — zero imports found) or document the reservation; bump the 500-char `metrics.jsonl` line cap to ~1000. (Sources 1, 2, 5.)
- **AST-based assertion-shield** (keep the regex as a fallback for unparseable diffs); **evaluator/security-reviewer judge fixtures** ("test the judges" — already an acknowledged adapt item in `feedback-2` #29); **E2E program** breadth so `e2e.yml` stops skipping; **guard-bash hardening** for PowerShell cmdlets + Unix indirection (best fixed by capability sandboxing, not more regex). (Sources 1, 4, 5.)
- **Major dependency upgrades** — next 15→16, zod 3→4, lucide-react 0.x→1.x — breaking-change evaluations, one scoped feature each (research confirms current latest). (Source 2.)
- **`verify.sh` Node/TS port** for native cross-platform execution. (Sources 1, 3, 4.)

## By-design / deferred-by-documentation / overstated (NOT defects)

- **"Product is a hollow mock / Potemkin"** — the `src/forge/*` modules are deliberately trivial **loop fixtures** for Phase 0 (plan exit criterion). The legitimate residue is the **honesty gap** (selling them as "Premium Platform"), which is fixed above. (Source 5 steelman acknowledged this.)
- **"`develop` lacks required human review"** — **by design.** The autonomous loop merges to `develop` on green CI; `main` requires human approval for promotion (Q-0001 resolved). Requiring review on `develop` would break the factory.
- **"path-guard documented-but-missing drift" / "guard-bash is vibes not mechanism"** — `feedback-2` already ruled these documented decisions: guard-bash is an honest **deterrent layer** (DECISIONS.md concedes regex evasion), the **real boundary is the environment + CI re-running the gate**. The F-0022 grooming addresses the strongest version (the guard literally not arming).
- **"183/174/173 test count drift"** — real doc inconsistency; actual current split is **16 product unit tests + 190 hook contract tests = 206**. (Captured here; STATUS regenerated from `features.json`.)
- **"Continuous 60s cadence burns tokens / PROGRESS.md spam"** — describes a transient **runtime orchestration** behavior, not a committed-code defect; not fixable by a file edit. Noted for operator awareness of run cadence.
- **"LICENSE missing"** — resolved (Q-0002, MIT).
- **Stale specifics:** the dirty-evidence worktree and abSim file-write race Sources 1/2/3 observed are **already fixed**; `.github/pull_request_template.md` already exists (Source-implied #1 already shipped per `feedback-2`).

## Operator notes (non-blocking — see QUESTIONS.md Q-0003)

- Honest marketing rewrite is intentionally conservative; confirm desired brand direction or further revise.
- Prioritize the groomed (F-0021/22/23) and recommended-backlog features against roadmap.
- The comparison table in `app/page.tsx` still names real competitors with specific pricing — now captioned "illustrative, not independently verified"; operator may want to neutralize it entirely.
