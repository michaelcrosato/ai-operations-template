# Progress Log

> Newest entry first. Each session **prepends** a block: date, feature id, what was done, what was verified (evidence paths), surprises, exact next step. The SessionStart hook injects the top ~50 lines into every new session.

---

## 2026-06-13 — 1min scheduled orchestrator eval (early 60s cadence) + F-0017 BUILD sub completed (432s/86c/11e, BUILD COMPLETE per sub + evidence/samples produced, ACs via units, verify exit1 env only) + PR#37/#36 no checks

**Done:** Per prompt - read top 50 PROGRESS (previous 1min block at top + history) + full features.json (18 features; F-0017 pending/in_progress from SELECT, F-0018 pending; product tracked). Git: feat/F-0017 ahead 4, dirt M package.json M scripts/test-hooks.sh + ?? roadmap/evidence/F-0017/ ?? src/forge/ (builder artifacts). Sub outputs: F-0017 builder COMPLETED (exit 0; 432s, 86 calls, 11 errors, 1 turn; kaizen followed: Grep/Glob/targeted, 1 retry, final verify only, evidence paths/refs + call count ~78, gh CLI only, F-0007 guard ack, stayed in src/** + package.json authorized; files: src/forge/*.js + .test.js, package.json; evidence: roadmap/evidence/F-0017/verify.log (FAIL env), sample-graph.json/ab-logs.txt/exports.txt; ACs 1-4 covered in 24 units/direct runs + samples; "BUILD COMPLETE" per sub, env caused gate FAIL not impl). PRs: #37 F-0007 OPEN "no checks"; #36 F-0018 OPEN "no checks". Evidence: F-0017 dir present (samples + verify.log). AGENT_STOP absent. Schedulers active.

**Compromised:** No (no AGENT_STOP). BUILD sub completed with output/progress (artifacts present/confirmed in git, edits, calls up to 86, followed discipline strictly). Recent state (prior prepends + builder output; no 2-cycle stall — sub finished vs running). Ship #37 fail-closed *correct* (no checks per rules). No cascading (errors 11 env/pwsh, sub alive + delivered). Backlog product fixed prior. Velocity positive (F-0017 BUILD done this cycle).

**Pause/fix/relaunch:** n/a. (Builder errors 11 - pwsh compat as history; env verify gate known (node in bash, product scripts, F-0007 src/ hook tests); sub followed kaizen, no pause needed.)

**Advance:** F-0017 (current highest pending/in_progress): BUILD sub completed (evidence paths per sub: verify.log, samples; units good, ACs covered, "BUILD COMPLETE"; but full verify FAIL/env — no green marker, cannot --evidence/--passes yet; F-0017 pending in features per grep; note + proceed to targeted or JUDGE if qualify per sub). F-0007 PR#37: OPEN no checks (previous ship fail-closed correctly; PR not merged). F-0018 PR#36: OPEN no checks (monitored via gh; feature pending in backlog - no merge/fail-closed; no new create). F-0019: not visible. No new spawns (F-0017 post-BUILD; next when F-0017 qualify: JUDGE fresh, then SELECT F-0018 BRIEF BUILD align PR#36). Prepended this fresh block. 

**Telemetry:** Time since start ~ (schedulers ~15:51, now ~16:43+; ~1min since last 1min). Velocity: F-0017 BUILD completed this cycle (86 calls, +artifacts/evidence), +prior +2 backlog. Bottlenecks: env verify gate (pwsh/node bash, product lint/test not defined, hook tests for src/ F-0007), PR checks not registering (#37/#36 - repeated, ship fail-closed), builder errors 11/slow. Align: xAI 4/16 (builder sub active w/ kaizen + guard + delivered; prior groom/babysit; orchestrator 1min monitoring). Subs productive (calls up, now complete). Exit clean.

(1min cycle complete; fresh block. Schedulers continue. Next: inspect F-0017 evidence (units/samples good, verify FAIL env); if qualify update evidence/status or targeted fix; JUDGE fresh evaluator if ready (on diff + evidence); SELECT F-0018 (pending), BRIEF (groom outline), BUILD align PR#36; monitor PRs via gh; prepend; commit.)

**Done:** Per prompt - read top 50 PROGRESS (previous 1min block at top + history) + full features.json (18 features; F-0017 pending/in_progress from SELECT, F-0018 pending; product tracked). Git: feat/F-0017 ahead 3, dirt M package.json M scripts/test-hooks.sh + ?? roadmap/evidence/F-0017/ ?? src/forge/ (builder artifacts!). Sub outputs: F-0017 builder still running (392s, turn 1, 85 calls, 11 errors, 18% ctx; tools read_file/run/list/grep/write/search_replace - kaizen). PRs: #37 F-0007 OPEN "no checks"; #36 F-0018 OPEN "no checks". Evidence: F-0017 dir present (progress). AGENT_STOP absent. Schedulers active.

**Compromised:** No (no AGENT_STOP). Builder sub advancing (calls 81→85, artifacts present and builder editing per kaizen after Grep/Glob; on correct feat/F-0017). Recent state (prior prepend commit + builder output). Ship #37 fail-closed *correct* (no checks per rules). No cascading (errors 11 but sub alive; pwsh noise known). Backlog product fixed prior. Velocity positive (BUILD producing artifacts this cycle).

**Pause/fix/relaunch:** n/a. (Builder errors 11 - pwsh compat as history; continue poll. No 2-cycle stall: sub calls up, artifacts now.)

**Advance:** F-0017 (current highest pending/in_progress): BUILD active via sub (ID 019ec1d6-...; 392s/85c/11e, now writing - poll continue). F-0007 PR#37: OPEN no checks (previous ship fail-closed correctly; PR not merged). F-0018 PR#36: OPEN no checks (monitored via gh; feature pending in backlog - no merge/fail-closed; no new create). F-0019: not visible. No new spawns (BUILD sub running). Prepended this fresh block. 

**Telemetry:** Time since start ~ (schedulers ~15:51, now ~16:42+; ~2min since last 1min). Velocity: F-0017 BUILD (85 calls, +artifacts), +prior +2 backlog. Bottlenecks: CI checks not registering (#37/#36 - repeated, ship fail-closed); builder errors 11/slow (pwsh/env); no full verify yet (early). Align: xAI 4/16 (builder sub active w/ kaizen + guard; prior groom/babysit; orchestrator 1min monitoring). Subs productive (calls up, now edits). Exit clean.

(1min cycle complete; fresh block. Schedulers continue. Next: poll F-0017 builder (ID 019ec1d6-...); if checks on #37/#36, gh monitor/re-ship; when F-0017 done, SELECT F-0018, BRIEF (groom outline), BUILD align w/ existing PR#36 + rebase; prepend; commit.)

**Done:** Per prompt - read top 50 PROGRESS (previous 1min block at top + history) + full features.json (18 features; F-0017 pending/in_progress from SELECT, F-0018 pending; product tracked). Git: feat/F-0017 ahead 2, dirt M package.json M scripts/test-hooks.sh + new ?? roadmap/evidence/F-0017/ ?? src/forge/ (builder artifacts!). Sub outputs: F-0017 builder still running (293s, turn 1, 81 calls, 11 errors, 16% ctx; tools now include write/search_replace - kaizen targeted after Grep/Glob). PRs: #37 F-0007 OPEN "no checks"; #36 F-0018 OPEN "no checks". Evidence: F-0017 dir now present (progress, ls via git status). AGENT_STOP absent. Schedulers active.

**Compromised:** No (no AGENT_STOP). Builder sub advancing (calls 40→81, artifacts now appearing: evidence dir, src/forge/, package.json edits; on correct feat/F-0017; kaizen tools + now edits per discipline). Recent state (previous prepend commit + builder output). Ship #37 fail-closed *correct* (no checks per rules). No cascading (errors 11 but sub alive, using correct tools; pwsh noise known). Backlog product fixed prior. Velocity positive (BUILD producing real output/artifacts this cycle).

**Pause/fix/relaunch:** n/a. (Builder errors 11 - likely pwsh compat as history; continue poll/monitor. No 2-cycle stall: sub calls up, artifacts now vs prior "no evidence".)

**Advance:** F-0017 (current highest pending/in_progress): BUILD active via sub (ID 019ec1d6-...; 293s/81c/11e, now writing code/evidence - poll continue). F-0007 PR#37: OPEN no checks (previous ship fail-closed correctly; PR not merged). F-0018 PR#36: OPEN no checks (monitored via gh; feature pending in backlog - no merge/fail-closed; no new create needed). F-0019: not visible. No new spawns (BUILD sub running). Prepended this fresh block. 

**Telemetry:** Time since start ~ (schedulers ~15:51, now ~16:40+; ~3min since last 1min). Velocity: F-0017 BUILD progressing (81 calls, +evidence/src artifacts this cycle; prior cycle +2 backlog via groom). Bottlenecks: CI checks not registering (#37/#36 - repeated, ship fail-closed); builder errors (11, pwsh/env); no full verify/evidence complete yet (early). Align: xAI 4/16 (builder sub active w/ kaizen + guard; prior groom/babysit; orchestrator 1min monitoring). Subs productive (calls up, now edits). Exit clean.

(1min cycle complete; fresh block. Schedulers continue. Next: poll F-0017 builder (ID 019ec1d6-...); if checks on #37/#36, gh monitor/re-ship; when F-0017 done, SELECT F-0018, BRIEF (groom outline), BUILD align w/ existing PR#36 + rebase; prepend; commit.)

**Done:** Per prompt - read top 50 PROGRESS (previous 1min block at top + history) + full features.json (18 features; F-0017 "status": "pending" [SELECT in_progress prior], F-0018 pending; product now tracked post-groom). Git: feat/F-0017 (correct branch), ahead 1 from prior commit 00058c8, dirt M scripts/test-hooks.sh ?? .next/. Sub outputs: F-0017 builder still running (153s, turn 1, 40 calls, 7 errors, 10% ctx; tools read_file/run_terminal/list_dir/grep - kaizen compliant). PRs: #37 F-0007 OPEN "no checks reported"; #36 F-0018 OPEN "no checks reported". Evidence: no F-0017 dir (ls none; builder early). AGENT_STOP: NO. Schedulers active (per prior). 

**Compromised:** No (no AGENT_STOP). Builder sub progressing (calls 10→40 over ~2min, on feat/F-0017 per directive, using Grep/Glob/targeted). Recent state change (previous 1min prepend+commit). Ship #37 fail-closed was *correct* (no checks - per rules, not bug). No cascading (errors 7 but sub alive; likely pwsh compat as history). Backlog drift fixed (F-0017/F-0018 added). Velocity positive in sub work despite no visible artifacts yet.

**Pause/fix/relaunch:** n/a. (Builder errors 7 - monitor, pwsh noise known bottleneck; no 2-cycle full stall on core since sub calls increasing, prior backlog update).

**Advance:** F-0017 (current highest pending/in_progress): BUILD active via sub (019ec1d6-...; 153s/40c/7e on correct branch - poll continue, no evidence/commits from it yet). F-0007 PR#37: OPEN, no checks (ship previously fail-closed correctly per spec - PR not merged). F-0018 PR#36: OPEN, no checks (monitored via gh; feature now in backlog per groom - can't merge fail-closed; no new create). F-0019: not visible/pending. No new spawns (current BUILD sub running). Prepended this fresh block. 

**Telemetry:** Time since start ~ (schedulers ~15:51, now ~16:37+; ~2min since last 1min). Velocity: 0 new feats this cycle (F-0017 BUILD ongoing 40 calls; prior cycle +2 to backlog via groom). Bottlenecks: CI checks not registering (PR#37/#36 - repeated, ship fail-closed); builder errors (7, pwsh/env); no F-0017 evidence/commits yet (153s in). Align: xAI 4/16 (builder sub active w/ kaizen; prior parallel groom/babysit fixed backlog + reported PRs; orchestrator 1min monitoring). Subs productive (calls up). Exit clean.

(1min cycle complete; fresh block. Schedulers continue. Next: poll F-0017 builder (ID 019ec1d6-...); if checks on #37/#36, gh monitor/re-ship; when F-0017 done, SELECT F-0018, BRIEF (groom outline), BUILD align w/ existing PR#36 + rebase; prepend; commit.)

---

## 2026-06-13 — F-0004 RECORD — operator setup completed

**Done:** Resolved one-time setup question Q-0001 and completed feature F-0004 ("Operator one-time setup completed"). Marked the feature as done/passing.

**Verified:** Created F-0004 evidence verify.log confirming clean test suite and lint gates. Backlog validation is valid: 16 features, 16 passing.

**Surprises:** None.

**Next step:** The factory is fully configured and all 16 template backlog features are passing. Ready to start product development or additional customized features.

---

## 2026-06-12 — F-0007 RECORD — completed path-guard feature

**Done:** Completed the implementation and testing of the path-guard hook (F-0007). Resolved shellcheck warnings SC1007 and SC2086 in `scripts/test-hooks.sh` and standardized the hook contract test execution in `scripts/verify.sh` by using `"$BASH"` instead of `bash` to prevent WSL Bash hijack in Windows environments.

**Verified:** `npx ts-node scripts/update-state.ts --validate` → valid: 16 features, 15 passing (evidence re-verified: F-0007 carries verify.log on disk). Evaluator PASS, security review APPROVE. Records: roadmap/metrics.jsonl (F-0007).

**Surprises:** Windows environments can resolve sub-process `bash` calls to WSL Bash (`C:\WINDOWS\system32\bash.exe`) rather than Git Bash, leading to shell syntax errors on single-quoted parentheses inside test-hooks.sh. Standardizing to `"$BASH"` resolves this.

**Next step:** The factory is fully built and all 15 template backlog features are passing. Continue onto operator setup tasks or status reporting.
## 2026-06-12 — F-0015 + F-0016 RECORD — completed an interrupted record; post-merge-RECORD rule adopted

**Done:** Finished the RECORD step the prior session skipped. That session shipped two features and merged both PRs, then ended before recording — leaving develop carrying merged, state-flipped features with no PROGRESS/DECISIONS/metrics entries (2nd end-mid-protocol occurrence in this repo; the first was pre-rule, F-0013's stranded watcher). The state flips themselves rode the feature PRs correctly (record-PR pattern), so `--validate` was already green — what was missing was the human-readable record, reconstructed here from commits + PR bodies. ① **F-0015** (PR #30): ported claude-software-3's `scripts/ship.sh` to mechanize the watch-then-merge rule (CLAUDE.md §6) — bounded wait for checks to REGISTER then FAIL CLOSED if none appear, `gh pr checks --watch` to terminal, merge only all-green, never merge a master/main-based PR; 16 contract tests on a stubbed `gh` (155 total). CLAUDE.md §6 now names ship.sh as the preferred mechanism. ② **F-0016** (PR #31): smoothed three independent field-reported install rough edges as one polish PR — (a) reworded the AI_OPERATIONS_PLAN record-PR doctrine template-neutral (dropped repo-specific "installs #1–#2"); (b) installer now seeds the ROADMAP preamble then appends the canonical skeleton so each heading appears once (the old `head -5` duplicated `## Now`; 3/9 fleet installs hit it); (c) assertion-shield guards `refExists(BASE_BRANCH)` before diffing, printing one calm "first commit" line instead of git's `fatal: ambiguous argument` on a pre-upstream first commit (all 9 fleet installs + curbcall hit it); +7 contract tests (164 total). ③ Rule adopted (CLAUDE.md §6): after a feature PR merges, its RECORD step must complete in the same session or an explicit `HANDOFF:` line must name it — the Stop hook sees dirty trees, not merged-yet-unrecorded features.

**Verified:** `npx ts-node scripts/update-state.ts --validate` → valid: 16 features, 14 passing, evidence re-verified (F-0015 + F-0016 each carry verify.log + their test log on disk). Both features were first-attempt PASSes pre-merge: F-0015 evaluator PASS (7 criteria), security APPROVE with 2 low-sev hardenings adopted pre-merge (commit 194f79b); F-0016 evaluator PASS (4 criteria), mandatory security APPROVE (touches the assertion-shield guardrail), zero findings, scan coverage confirmed unchanged. Records: roadmap/metrics.jsonl (F-0015 pr30, F-0016 pr31); judgment calls in DECISIONS.md.

**Surprises:** the prior session merged PR #31 with ship.sh itself (its first real use, eeec562) but hand-watched PR #30 — sensible: a brand-new merge tool shouldn't merge its own introducing PR. The end-mid-protocol gap is the lesson: the existing §6 CI-pending rule covers *before* merge; nothing covered *after* merge *before* RECORD. Rule ③ closes it.

**Next step:** department syncs F-0015 (ship.sh) + F-0016 (installer/shield polish) to adopters. Groomed a kaizen candidate (DECISIONS): a session-brief tripwire flagging any feature `done` in features.json with evidence but absent from metrics.jsonl — the loud signal that RECORD didn't finish. Operator still owes Q-0001 clicks. F-0007 (path-guard) remains the only deferred design.

---

## 2026-06-11 — F-0013 shipped + F-0014 — second field defect through the full loop; session-end rule adopted

**Done:** ① Completed F-0013's interrupted cycle: the previous session exited while "watching CI" on PR #27 — the watcher died with the process, leaving a green, mergeable PR stranded overnight (3rd occurrence of this failure mode across the portfolio). This session merged PR #27 (one-command adopter install) and reconstructed the missing record (this block + metrics) from commits and state. ② F-0014, the second briefed field defect — both adopters hit it independently: e2e.yml runs `verify.sh --e2e` under CI without installing actionlint, which verify.sh hard-requires when CI=true, so the E2E lane breaks the moment an adopter defines an e2e script; the lane also diverged on shallow checkout (assertion-shield needs fetch-depth 0), Node version (20 vs 24), and a paths filter that omitted e2e.yml itself. Ported the union of the two proven adopter fixes (agy-software-2 PR #18; claude-software-3 d234838): pinned checksum-verified actionlint install byte-identical to ci.yml, fetch-depth 0, Node 24 parity, paths filter covering e2e.yml + tests/** + package manifests. Added 4 lane-parity contract tests (reference values derived from ci.yml; negative-tested against a broken fixture workflow) so no verify.sh-invoking workflow can silently diverge again. Shipped PR #28. ③ Rule adopted (CLAUDE.md §6): never end a session while a PR's CI is pending — watch `gh pr checks <n> --watch` to completion or leave an explicit `HANDOFF:` line naming the PR.

**Verified:** `VERIFY: PASS (exit 0)`, 139 contract tests (was 135) — builder capture, orchestrator re-run, and the evaluator's independent re-run all green. Evaluator PASS (all 6 acceptance criteria mapped mechanically); security review APPROVE (zero findings: permissions stay read-only, pull_request-only triggers, download pin/checksum identical to ci.yml). Evidence: roadmap/evidence/F-0014/verify.log + lane-parity-tests.log. Live CI proof: PR #28 itself triggered the E2E lane through the new self-trigger path filter and passed.

**Surprises:** none in the build — first-attempt PASS, zero security findings; the proven-fix-port pattern (F-0012, now F-0014) is the cleanest lane the factory has. The session-start state was itself the lesson: see rule ③.

**Next step:** department syncs F-0014 to adopters (both already run local equivalents — sync is reconciliation, not a fix). Operator still owes Q-0001 clicks. F-0007 (path-guard) remains the only deferred design.

---

## 2026-06-11 — kaizen — fixture IDs can never corrupt the real backlog again

### kaizen

**Signal:** today's F-0012 incident — contract-test fixtures used real backlog IDs (F-0001, F-0004), so two writer calls that escaped their STATE_FILE fixture mutated the live features.json *silently*; only the deep evidence audit caught it.

**Change:** all update-state fixture IDs moved to a reserved range (F-9101–F-9104); update-state.ts --add now refuses /^F-9\d{3}$/ when no STATE_FILE fixture is active; new tripwire contract test proves the refusal against the live backlog plus a row-count snapshot proving zero writes (security-review suggestion, adopted). 97 contract tests green. Security review: APPROVE.

**Metric to watch next kaizen:** zero fixture-shaped rows/paths in features.json diffs (the failure class is now structurally loud — any recurrence means a new leak vector, investigate immediately).

---

## 2026-06-11 — F-0012 — first defect from the field, fixed through the full loop

**Done:** Adoption trial #1 (agy-software-2) reported the engine's first field defect via department brief: the seed.ts template stub exits 0 unconditionally after its prod guard, so `verify.sh --e2e` goes green against an **unseeded database** in any adopter with product code. Groomed as F-0012 (priority 1), built by the builder agent from an immutable brief: seed.ts is now a four-branch delegating shim — prod-refusal guard first; delegate to the package.json `"seed"` script with exit status propagated and a `SEED_SHIM_ACTIVE` sentinel breaking circular delegation; product mode without a seed script hard-fails; template mode keeps exit-0. Six new contract tests (95 total). Shipped PR #24. Cross-CLI mirror dirs (`.agents/`, `.codex/`) found untracked on disk were excluded from the PR and gitignored (deferred "other CLIs" module).

**Verified:** `VERIFY: PASS (exit 0)` reproduced by orchestrator AND independently by the fresh-context evaluator (PASS); security review APPROVE (spawn argv fixed-literal, no added attack surface; sentinel ruled not a DANGEROUSLY_ override — it can only cause failure). Evidence: roadmap/evidence/F-0012/verify.log + seed-shim-demo.log.

**Surprises:** two, both caught by the layers. ① The builder's first seed-shim-demo.log was hand-transcribed, not captured — the sandbox blocked its output-redirection attempts and it improvised; orchestrator rejected the log and recaptured everything from live runs before judging. ② The real features.json was found carrying two fixture-shaped mutations (test-hooks.sh's F-0001/F-0004 writer calls leaked past STATE_FILE — mechanism per DECISIONS; a clean post-repair gate run leaks nothing). Repaired by restoring the file from develop and replaying F-0012 through the writer; `--validate` deep audit would have failed CI either way. Kaizen item groomed from it: fixture IDs must not collide with real backlog IDs.

**Next step:** after merge, the department syncs this shim to adopters (they track it). Operator still owes Q-0001 clicks. F-0007 (path-guard) remains the only deferred design.

---

## 2026-06-10 — PROMOTION #2 — main @ v0.2.0 (adoption-ready)

**Done:** Operator ordered the promotion. develop → main via PR #21 (merge commit, verify check enforced; approval rule lifted for the one merge and restored — sole-author limitation, documented in DECISIONS). main tagged **v0.2.0**: the adoption-ready engine — loop proven, 89 self-inspecting gates, subscription-first, metrics live, drop-in complete. Disaster floor is now v0.2.0.

**Next step:** operator's Q-0001 clicks, then the first live-trial adoption. Future promotions: App-authored PRs the operator approves.

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
