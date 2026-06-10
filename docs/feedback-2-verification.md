# feedback-2.md — Verification Report

**Date:** 2026-06-10 · **Method:** 14 independent agents (11 group verifiers + lean-core skeptic + fact re-verifier + fork judge), 335 tool calls, every load-bearing claim checked against primary sources (vendor docs, GitHub APIs, advisories) and against this repo's actual state. Full machine-readable verdicts: [`feedback-2-verdicts.json`](feedback-2-verdicts.json). Per the engine's P1 rule, every claim was presumed wrong until verified.

## Bottom line

Of 126 verdict entries (77 items, several split into sub-parts, plus forks/gaps/avoid-list):

| Verdict | Count | Meaning |
|---|---|---|
| **adopt-now** | 26 | Verified current, lean, clear win — groomed into backlog (F-0008–F-0011) |
| **adopt-later** | 27 | Good, but sequenced (mostly: behind the public flip, branch protection Q-0001, or Phase 1 product code) |
| **adapt** | 25 | Right instinct, wrong shape for this engine — concrete reshape specified |
| **already-done** | 25 | The repo already has it (feedback was generated against a stale snapshot) |
| **reject** | 18 | Conflicts with the engine's philosophy, stale tooling, or factually wrong |
| **operator-decision** | 5 | Genuinely the human's call (license, cross-CLI priority, governance posture) |

**The feedback contains 52 refuted claims.** The recommendations are directionally valuable — the §J avoid-list and §K conflict-surfacing are excellent — but the document must not be executed as written.

## Claims in feedback-2 that are wrong (verified against primary sources)

1. **The "v1.0.94 floor" for claude-code-action does not exist.** Triple-verified via the live advisories page: the only published advisory is **GHSA-8q5r-mmjf-575q / CVE-2026-47751** (published 2026-05-20, affected `< 1.0.74`, malicious `.mcp.json` in PRs → RCE/secret exfiltration). Item #10's proposed "≥ v1.0.94 CI assertion" and §O's "v1.0.94 floor" strength claim both cite a phantom advisory. Our pin (= tag v1) is far beyond the real floor.
2. **AGENTS.md direction is inverted.** Claude Code's official memory docs state verbatim: *"Claude Code reads CLAUDE.md, not AGENTS.md"* — the documented pattern is a CLAUDE.md that **imports** `@AGENTS.md` (and explicitly: use the import, not a symlink, on Windows). Item #61's "stub pointing at CLAUDE.md" works only for *other* tools; its "divergence check in verify" is meaningless for a pure pointer. (code.claude.com/docs/en/memory)
3. **sweepai/sweep is abandoned** as an open-source CI-autofix pattern source (repo banner: pivoted to a JetBrains assistant). Item #16's pattern source is dead; the engine also already streams verify failures to the builder in-session, and auto-triggering claude.yml on CI failure would undo its hard human-actor gate. Rejected.
4. **#73 (.env.example) is self-defeating in this repo:** our `.gitignore` (`.env.*`), `Read(.env*)` deny rules, and security-patterns regex would make the file unreadable and unmaintainable by the agents meant to keep it current. Reshaped: document env-var *names* in plain markdown when a product stack lands.
5. **"Documented-but-missing drift" framing (format hook, path-guard) is false.** Both are *formally deferred* with documented decisions (plan §6.3; path-guard = backlog F-0007). Evaluators also already diff changed files against `authorized_paths` — path discipline is not "prompt obedience only."
6. **§O baseline is stale:** "45/45 tests" (now 63), ">0 tests/0 failures report parsing" (actual: `VERIFY: PASS` marker + CI re-run backstop, by documented decision), Gap 3 (dependency automation — `dependabot.yml` shipped and already merged its first wave), Gap 6 (drift — closed/deferred formally), #18 (skipped E2E is loudly fatal: `verify.sh` fails the run), #19 (cycle detection, consistency invariants, commit signature: all shipped), #23 (checkpointing — the file-based state machine + PROGRESS handoff *is* the checkpoint design; a parallel `checkpoints/` dir would be dual state), #34 (Claude Code's native Edit tool already is search/replace-shaped).
7. **Stale artifact references:** spec-kit's `constitution_update_checklist.md` no longer exists at main (absorbed into a command template); zizmor now lives under `zizmorcore` and its `unpinned-uses` default (hash-pin *everything*) conflicts with our documented tag-pin decision unless configured.

## Adopt now (verified, reshaped where noted → backlog F-0008–F-0011)

| Item | What ships | Verified currency |
|---|---|---|
| B-11 | **shellcheck + actionlint** over hooks/scripts/workflows — hard gate in CI, `command -v`-guarded soft-skip locally (Windows operator). shfmt optional; **zizmor → later** (config needed to respect our tag-pin decision) | actionlint v1.7.12 (2026-03); zizmor v1.25.2 (2026-05) |
| B-12 | **Biome lint** for the engine's own TypeScript (one devDependency + minimal config; kills the "(no lint script)" skip). Format hook follows as sequenced step 2 — Biome dissolves its documented precondition | Biome 2.4.x current |
| #26 | **`roadmap/metrics.jsonl`** — one record per /work session at RECORD; `/kaizen` finally gets the metric feed its own SKILL.md step 4 demands; `/status` cost/health line becomes data-fed. Plus #28's useful half: first-vs-second-attempt pass rate (maps to the two-strike rule) | — |
| #46 | **Exfil-POST guard patterns** — block secret-shaped strings / non-allowlisted hosts in `curl`/`gh api` POST shapes (NOT all POSTs — downtime sentinel legitimately calls gh api). Mirrors Anthropic's own post-incident gh-wrapper fix | Microsoft Security Blog 2026-06-05 |
| #50 | **Trust-widening tripwire** — CI step failing PRs that add `allowed_non_write_users`-class keys or `.mcp.json` changes to workflows. Mirrors claude-code-action's own `non-write-users-check.yml` (verified exists) | upstream workflow verified |
| #20 (part) | **assertion-shield: `.skip`/`.only`/`xit`/`xdescribe` detection** (added-line regex, same shape as existing shield) | — |
| #1 | **PR template** (core sections only — the operator template the constitution already mandates). Rejected riders: agent-disclosure checkbox (everything here is agent-authored by constitution), PR-size labeler | — |
| #41 | **Dangerous-naming convention** — one rule line: future override flags must carry `DANGEROUSLY_`/`--dangerously-` naming | — |
| #61 (adapted) | **AGENTS.md 3–5-line pointer stub** for *other* CLIs (Claude Code keeps CLAUDE.md per docs); no divergence check | docs verified 2026-06-10 |
| #30 (part) | **`roadmap/briefs/TEMPLATE.md`** — the briefs dir is already load-bearing (/downtime writes, /work consumes); zero-cost canonical shape | — |
| #48 (adapted) | **Model-policy staleness check in `update-state --validate`** (zero-token date compare, warns >30d) — instead of a scheduled cron auto-PR, which would bill the agent-credit pool and violate J-4 (no scheduled write-capable automation before branch protection) | — |
| #53 (adapted) | **Placeholder check gated on PRODUCT_MODE** (~5-line grep) — always-on would permanently fail the template's own gate | — |
| J-01…J-25 | **Avoid-list formally adopted** as DECISIONS-level policy (16 adopt-now + 9 already-encoded), at zero always-loaded context cost | — |

## Key reshapes (adapt)

- **#29 Evals (the all-6-reports item):** the gap is real — 63 contract tests for hooks, **zero behavioral tests for the prompts that grade everything else** — and promptfoo is verified current (0.121.15, 2026-06-05). But as written it's platform-building (nightly benchmarks, leaderboards, companion repos). Reshape: (1) deterministic fixtures (guard-bash evasion corpus, forbidden-edit, state-mutation tasks) go into the existing contract-test suite at zero tokens; (2) a small evaluator/security-reviewer fixture set (weakened-assertion diff → must NEEDS_WORK; seeded IDOR → must BLOCK) runs as a manual/`/kaizen`-triggered promptfoo config, advisory first; gating and scale only after the loop is proven on real product work.
- **#17 quick/full verify:** a `--quick` flag would poison the evidence contract (`--passes` keys on the full-run marker). Reshape: one line of test-scoping discipline in builder.md; the marker stays full-run-only.
- **#22 evidence index/manifests:** `features.json` already *is* the index (single-writer enforced); hash manifests re-litigate a threat closed by documented decision (CI re-runs the real gate). Adopt only: snapshot the brief + model tier into the evidence dir at pass-flip.
- **#24 workspace reset:** `reset --hard` in the retry loop would destroy attempt-1 work the evaluator's findings reference and normalize a destructive habit. Reshape: define attempt-2 branch hygiene in /work (continue on the same branch for incremental fixes; fresh branch from origin/develop only on strike-2 redesigns).
- **#36 stuck detection:** not OpenHands platform machinery; a ~20-line repeated-failing-command check in guard-bash + making the two-strike counter budget knobs explicit.
- **#44/K-2 MCP registry:** registry-*principle* now (a 10-line trust-policy rule in the plan: any future external tool requires a registry entry before integration); the machine-readable `tool-policy.json` waits for the first actual external tool. MCP TS SDK is mid-transition (pre-alpha v2) — migration churn confirms deferral.
- **#47 threat model:** plan §12 + `claude-security-guidance.md` already carry it; a third artifact would drift. Fold a dated In/Out-of-Scope block into SECURITY.md at the public flip.
- **#56 self-bootstrap:** as an *adoption step* in the drop-in instructions (agent generates the product README by reading the codebase), not a new static artifact.
- **#60 versioning:** adopt the cheap slice now-ish (CHANGELOG aggregating DECISIONS since last tag + release checklist — v0.1.0 already exists); `upgrade.sh`/installer is 1+wk and waits for real adopters.
- **#63 constitution checklist:** the cited spec-kit artifact no longer exists; a 5-line pre-edit checklist folded into CLAUDE.md §9 instead.
- **#75 Zod everywhere:** update-state already validates I/O in code with contract tests; a new runtime dependency buys little until external/MCP tools exist (then yes, at the boundary).

## Rejected (with the one-line reason)

#7 triage taxonomy (no issue traffic; competes with QUESTIONS.md) · #16 CI-autofix loop (pattern source dead; in-session feedback exists; would weaken claude.yml's gate) · #25 snapshot tests (operator-facing text is judged by evaluator rubric, not byte-stability) · #27 full trace-level JSONL (Claude Code's native OTel — `CLAUDE_CODE_ENABLE_TELEMETRY=1`, verified — already exists for that depth; building a parallel trace store is platform work; #26 metrics.jsonl is the lean slice) · #33 ACI pagination (Claude Code truncates natively; rebuilding SWE-agent's shell violates first-party-primitives) · #37 minimal bash builder (second agent codepath to maintain; tiers already scale cost) · #38 state graphs (P4; fork-1) · #39 worktree script (no routine parallel branches) · #42 bespoke Docker (Claude Code ships **native OS-level sandboxing** — bubblewrap/seatbelt + sandbox-runtime; cloud sandboxes are already the isolation; fork-4) · #45 MCP-server consolidation (deterministic scripts must not become model-mediated; SDK in flux) · #54 troubleshooting docs / #55 examples library / #59 structured-output examples (no external adopters; drift liabilities) · #62 vendor-neutral `.agents/` (premature ×N projection machinery) · #70 GitHub Projects (state lives in files by design) · #74 src/packages layout (no src/ exists; template must not impose layout downstream) · K-1/K-6 as above.

## Fork rulings (vs the addendum's resolutions)

| Fork | Ruling | vs addendum |
|---|---|---|
| 1 Graphs/parallelism | Reject — P4 is explicit; DECISIONS already encodes it | agree |
| 2 MCP timing | Reject migration; registry as a policy *rule* now, artifacts at first real tool | mostly agree (leaner) |
| 3 Scanners | shellcheck+actionlint now (CI-hard/local-soft); zizmor at next CI touch with tag-pin-respecting config; semgrep/codeql at product code | agree + refinement |
| 4 Docker | Adopt-later via **first-party Claude Code sandboxing**, never bespoke Docker | addendum was silent (its "Fork 4" mislabels the license question) |
| 5 CODEOWNERS | Adopt-later, gated on Q-0001 (inert without required-review protection); guardrail-path map, enforced on main only | sides with R7 conditionality |
| 6 Layout | Reject now; verify.sh's PRODUCT_MODE seam already exists | — |
| 7 AI PR review | Adopt diff-analysis-only with claude.yml-grade trust gates; note the upstream action is only weakly maintained (last commit 2026-02) | camps reconcile, as §K itself noted |

## Operator decisions needed (logged in QUESTIONS.md)

1. **License** (Q-0002): MIT (max adoption, lower friction for an embedded template) vs Apache-2.0 (patent grant). Needed before any sharing; zero urgency while private.
2. **Branch protection** (existing Q-0001) — now also gates CODEOWNERS (#6) and any scheduled automation (#48, J-4).
3. **Cross-CLI priority** (O-gap-12): the AGENTS.md stub ships regardless (cheap); deeper cross-tool investment only if you actually run Codex/goose/Cline here.

## Sequencing (answers the addendum's "Option A or B")

**Neither, as written.** Option A's governance pack is mostly *adopt-later* (its value activates at the public flip; LICENSE is yours to pick). Option B's path-guard is already sequenced as F-0007 with an open design question, and its pagination half is rejected. The verified order:

1. **F-0002** — prove the loop end-to-end (J-25/O-gap-01: every report's "before enterprise process" precondition; already priority 1).
2. **F-0008** — guardrail static analysis + engine lint (B-11/B-12).
3. **F-0009** — deterministic security tripwires (#46, #50, #20-skip, #48-staleness).
4. **F-0010** — session metrics as data (#26, #28-pass-rate).
5. **F-0011** — docs & convention pack (#1, #41, #61-stub, #30-template, #32-line, #63-checklist, #53-gated).
6. Then, per sequencing gates: evals slice (#29 reshaped), zizmor, CHANGELOG slice (#60), devcontainer (#43), public-flip governance pack (#2–#8).

## Key sources

code.claude.com/docs/en/memory (AGENTS.md) · code.claude.com/docs/en/monitoring-usage (OTel) · code.claude.com/docs/en/sandboxing + anthropic.com/engineering/claude-code-sandboxing (native sandbox) · github.com/anthropics/claude-code-action/security/advisories/GHSA-8q5r-mmjf-575q · microsoft.com/en-us/security/blog/2026/06/05 (exfil chain) · promptfoo 0.121.15 / promptfoo-action 1.3.3 releases · actionlint v1.7.12 · zizmor v1.25.2 (zizmorcore) · StrykerJS 9.6.1 · biomejs.dev (2.4) · anthropics/claude-code/.devcontainer (init-firewall.sh) · docs.github.com (private vulnerability reporting = public repos only)
