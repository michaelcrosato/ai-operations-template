# Progress Log

> Newest entry first. Each session **prepends** a block: date, feature id, what was done, what was verified (evidence paths), surprises, exact next step. The SessionStart hook injects the top ~50 lines into every new session.

---

## 2026-06-10 — F-0008…F-0011 + subscription-first — adoption-readiness wave

**Done:** ① Subscription-first auth verified against official docs and shipped (PR #17): every lane runs on the Claude Max plan — cloud/Routines = login, @claude lane = CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token` billing the included agent credit pool; no API key required anywhere, from any provider. ② F-0008+F-0009 (PR #18): biome/shellcheck/actionlint as engine meta-gates (all findings fixed), exfil-upload guard, trust-widening + MCP CI tripwires, shield .skip/.only detection, model-policy staleness warning. ③ F-0010+F-0011 (PR #19): metrics.jsonl (seeded, validated, 500-char cap) wired into /work//kaizen//status; operator PR template; AGENTS.md stub; briefs/TEMPLATE.md; dangerous-naming + constitution-edit checklist; adoption-gated placeholder check.

**Verified:** 89 contract tests green; every PR through evaluator + security review (cycles honestly logged: tripwire self-trip, wget gap, evidence-before-judging — each caught by a different layer and fixed with tests).

**Surprises:** the --paths scope-hardening from the morning correctly refused to rescope a factory feature in the afternoon — rescope-cannot-grant-guard-surfaces held against its own author.

**Next step:** operator's 3 clicks (Q-0001: App install, CLAUDE_CODE_OAUTH_TOKEN secret, cloud env), then first-repo live trial. F-0007 (path-guard) remains the only deferred design.

---

## 2026-06-10 — F-0002 — THE LOOP IS PROVEN END-TO-END

**Done:** Branch protection enabled via API first (develop: PR+verify; main: +1 approval; enforce_admins — it blocked a red merge within the hour, working as designed). Then F-0002 ran the complete loop: SELECT (`--status in_progress`) → groom correction via new `--paths` verb (shipped PR #13 when grooming proved too narrow — caught honestly, fixed through its own gated PR) → BRIEF (roadmap/briefs/F-0002.md, immutable) → BUILD (builder sub-agent created src/health.js + src/health.test.js exactly to brief, hit a real Windows/Node-24 defect in MY prep, refused to exceed scope, escalated with a verified fix — the conditions-problem protocol worked) → VERIFY (first PRODUCT_MODE green: unit tests + lint now hard gates; evidence ×3) → JUDGE (fresh evaluator PASS, independently re-ran everything) → SHIP (PR #14, operator template) → RECORD (this entry).

**Verified:** VERIFY: PASS with VERIFY-COMMIT signature; 4/4 unit tests, 66/66 contract tests; evaluator reproduced independently.

**Surprises:** `node --test <dir>` silently broken on Windows Node 24 (glob form works everywhere); custom agent roster doesn't hot-load mid-session locally (mandates inlined — cloud unaffected).

**Next step:** wave-1 hardening F-0008–F-0011. Operator owes the rest of Q-0001 (App install, ANTHROPIC_API_KEY, cloud env).

---

## 2026-06-10 — optional-modules catalog + operator-intent rule

**Done:** Operator asked that repo-state-dependent ideas live outside the core. Shipped docs/optional-modules.md — every adopt-later/conditional module from the verified review, keyed by its activation trigger (product code lands / public flip / protection on / first external tool / other CLIs / adopters exist), explicitly marked NOT core. Wired: /downtime sentinel now checks the triggers and grooms modules when one fires; plan §2.3 adds the three-question core-vs-optional-vs-product rule; README points at the catalog. Also codified the operator's standing instruction in CLAUDE.md §8: remarks are intent, never literal edits — nothing bypasses the gates. MIT license landed earlier today (PR #11).

**Verified:** gate green (63/63); docs-only diff — zero changes to hooks, gate scripts, or workflows.

**Next step:** unchanged — F-0002, then wave-1 F-0008–F-0011; operator owes Q-0001.

---

## 2026-06-10 — feedback-2 verification — 77 items, 14-agent fleet

**Done:** Operator supplied feedback-2.md (consolidation of 6 model research reports, 77 items). Per P1, ran a full verification workflow: 11 group verifiers web-checked every load-bearing claim against primary sources (vendor docs, GitHub/advisory APIs) + repo ground truth, then 3 adversarial skeptics (lean-core, independent fact re-verifier, fork judge). 335 tool calls. Results: 26 adopt-now (groomed → F-0008 static analysis/lint, F-0009 security tripwires, F-0010 metrics.jsonl, F-0011 docs/convention pack), 27 adopt-later (sequenced on public flip / Q-0001 / Phase 1), 25 adapt (reshapes specified), 18 reject, 25 already-done, 5 operator-decision (Q-0002 license added). **52 claims in the feedback refuted** — headline: the "v1.0.94" claude-code-action floor is a phantom (real: GHSA-8q5r-mmjf-575q <1.0.74), AGENTS.md design was inverted vs official docs, sweep is abandoned, several "gaps" were already closed here. Report: docs/feedback-2-verification.md (+ verdicts JSON).

**Verified:** every adopt-now claim carries a primary-source URL dated 2026-06; full gate green.

**Surprises:** Claude Code now ships native OS-level sandboxing (bubblewrap/seatbelt + sandbox-runtime) — resolves the Docker fork in favor of first-party primitives; none of the 6 source reports knew.

**Next step:** F-0002 (prove the loop) remains priority 1, then wave-1 F-0008–F-0011. Operator owes Q-0001 (protection) and Q-0002 (license).

---

## 2026-06-10 — PROMOTION #1 — main created at v0.1.0

**Done:** Operator ordered the first promotion. `main` created at develop HEAD `2b9f643` (API path — agent git-push to main is hook-blocked by design), tagged `v0.1.0`. `develop` stays the default branch. Stable baseline now exists: the disaster floor is "revert to v0.1.0".

**Next step:** future promotions go develop→main as App-authored PRs with a `/qa-pack`. Branch protection on main (PR + operator approval) still needs the operator — Q-0001.

---

## 2026-06-10 — housekeeping — self-audit after F-0006

**Done:** Trust-but-monitor pass over the session's own output. Found and fixed: plan §3 layout tree missing six shipped artifacts (kaizen/downtime skills, test-hooks.sh, evidence/, briefs/, dependabot.yml); plan §4.2 overpromising ("validates against features.schema.json", "test-runner JSON report") vs what is actually implemented (in-code invariants; VERIFY-marker log + CI re-run backstop) — wording now matches code; dead line in test-hooks.sh; STATUS.md regenerated (was a day stale); ROADMAP bullets annotated ✅ shipped.

**Verified:** full gate re-run green on develop HEAD before and after edits (63/63).

**Next step:** unchanged — F-0002 demo loop, F-0004 operator setup (Q-0001).

---

## 2026-06-10 — F-0006 — External-review remediation (nine verified defects)

**Done:** Fixed all nine defects from the verified external review: assertion-shield now scans staged changes (`--cached`) and catches wholesale test-file deletions (`--- a/` parsing), and uses execFileSync (security-guidance plugin finding); `update-state.ts --validate` deep-audits evidence of every passing feature and rejects done-without-passes and dependency cycles; `security-patterns.json` rewritten to the real plugin schema (was silently inert); guard-bash blocks refspec (`HEAD:refs/heads/main`) and flag-separated (`git -C . push`) variants; promotion-PR identity documented (App/bot authors it — operator can't approve own PRs); dependabot.yml shipped; format hook + path guard formally deferred (F-0007); verify.sh hard-fails missing test/lint once `src/` exists; verify-rules.ts no longer emits false-positive warnings; OPERATOR_GUIDE recovery is now zero-CLI (@claude comment or GitHub Revert button). Plan security citations corrected to GHSA-8q5r-mmjf-575q + Claude Code 2.1.128, verified 2026-06-10 against the GitHub advisory API and vendor docs.

**Verified:** `bash scripts/verify.sh` green with expanded contract suite (63 tests) — evidence `roadmap/evidence/F-0006/verify.log`. Review cycle (attempts: 1): evaluator PASS; security reviewer **BLOCKED** on an empirically confirmed gap — `git push origin +main` (+refspec force syntax) evaded both push guards — plus long-flag variants (`--work-tree /x push`); fixed, six contract tests added, re-review **APPROVE** (PR #3).

**Surprises:** ① the security-guidance plugin (fixed this session) immediately flagged a real issue in the very file being edited; ② the re-reviewer's own test commands were blocked by the live guard hook — the layers are compounding.

**Next step:** F-0002 demo loop; F-0004 operator setup (Q-0001); F-0007 path-guard design.

---

## 2026-06-09 — F-0005 — Philosophy + downtime protocol

**Done:** Operator stated the engine's governing philosophy (six principles: frontier-only freshness, full AFK autonomy, non-technical operator, token-efficient orchestrator, self-improving/self-fixing, servant leadership + axe-sharpening). Codified it three ways: README "Philosophy" section (operator-facing), plan P6 + new §5.5 "Downtime & idle protocol" (mechanics: sentinel scan → risk research → pre-briefs → kaizen → spot checks, capped at ~30% session budget), and a new `/downtime` skill wired into `/work` SELECT and CLAUDE.md. `/work` BRIEF now consumes pre-written briefs from `roadmap/briefs/`.

**Verified:** `bash scripts/verify.sh` green — evidence `roadmap/evidence/F-0005/verify.log`; fresh-context evaluator PASS (see PR #2).

**Surprises:** none — pure docs/skills feature; security review skipped per sensitivity rule (DECISIONS).

**Next step:** unchanged — F-0002 demo loop, F-0004 operator setup (Q-0001).

---

## 2026-06-09 — F-0001 — Factory bootstrap (Phase 0)

**Done:** Repo git-initialized with `develop` as default branch; pushed to github.com/michaelcrosato/ai-operations-template (private, marked as GitHub template). Reviewed repo against blueprint — found the control plane ~75% missing (no agents/skills/hooks/CI/state files; CLAUDE.md referenced nonexistent scripts). Built Phase 0 on `feat/F-0001-build-the-factory`: roadmap state files, package.json + tsconfig, model-policy.json, 5 sub-agents, 6 skills, 3 path-scoped rules, 4 hooks wired into settings.json, init.sh / verify.sh / update-state.ts / seed.ts, hardened assertion-shield (CI ignores bypass env), CI workflows.

**Verified:** `bash scripts/verify.sh` green — typecheck + state validation + assertion shield + **45/45 hook contract tests** (F-0003). Evidence: `roadmap/evidence/F-0001/verify.log`, `roadmap/evidence/F-0003/contract-tests.log`. Two parallel fresh-context review agents ran pre-merge: evaluator (5 findings, all fixed: uncommitted gate fix, stale evidence, `.gitignore *.log` swallowed all evidence, missing exec bits, Stop-only registration) and security reviewer (APPROVE; path-normalization bypass fixed, claude.yml SHA-pinned, accepted risks logged in DECISIONS).

**Surprises:** ① `.claude/settings.json` permission rules were bare strings — silently skipped; doctor's suggested fix was wrong (no `Npm` tool exists). ② Write tool emitted CRLF on Windows, which silently breaks bash hooks — `.gitattributes` now pins LF. ③ `.gitignore`'s `*.log` was ignoring the entire evidence directory — the engine's core contract was unshippable until contract tests + evaluator caught it. ④ In PowerShell, `bash` resolves to WSL bash (no node) — hook tests must run under Git Bash.

**Next step:** Run F-0002 — a deliberately trivial demo feature through the full SELECT→BRIEF→BUILD→VERIFY→JUDGE→SHIP loop — to prove the engine end-to-end before real work. Operator still owes the one-time setup (Q-0001).
