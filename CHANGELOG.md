# Changelog

All notable changes to the **ai-operations-engine** template, newest first. **Scope: engine/template
changes only — *not* per-feature product delivery** (that history lives in `roadmap/PROGRESS.md`). This is the
human-readable companion to `roadmap/PROGRESS.md` (narrative) and `roadmap/DECISIONS.md` (one entry
per judgment call) — it summarizes what an adopter or operator would care about. Format follows
[Keep a Changelog](https://keepachangelog.com/). The template is rolling (latest `develop` + tag
`v0.1.0`), so changes accrue under **Unreleased** until a tag is cut.

## [Unreleased]

### Added
- **Bounded one-shot tool MVP (`src/oneshot/`) (2026-06-18).** Admission gate (F-0040: single machine-checkable acceptance + working-set token budget) + evidence-gated verdict (F-0041: PASS only on captured exit-0 proof, ignores the agent self-claim). First slice of the bounded-single-shot product (`docs/bounded-vs-afk-strategy.md`); reuses the shared guardrail core, zero new dependencies. First features to exercise the risk-tier layer end-to-end (Tier B).

### Fixed
- **verify-gate.sh Windows absolute-path normalization (F-0042).** Canonicalizes to repo-relative via `path.relative` mirroring path-guard.js; in-scope edits on Windows are no longer wrongly blocked (the bug had forced builders to bypass the guard). path-guard.js root aligned to `CLAUDE_PROJECT_DIR||cwd`. First Tier-C feature (builder-strong + evaluator + security-reviewer).
- **Hook-contract test isolation (F-0043).** Six permissive-mode tests now pin a zero-in_progress STATE_FILE fixture instead of the live backlog, so `verify.sh` passes while a feature is in_progress. Hook-contract tests: 367.

### Removed
- **Removed the ForgeOps demo — engine-only template (2026-06-16).** The non-functional browser
  mockup the engine had built to demonstrate itself is gone: all demo code, config, dependencies,
  and docs deleted (`app/`, `components/`, `lib/`, `e2e/`, `src/forge/`, the Next.js/React/
  Playwright/Tailwind toolchain, `Dockerfile`, `docker-compose.yml`, the E2E CI workflow), leaving
  `src/health.js` as the only product code. The backlog shed all 12 demo-related rows (33 → 21
  features). The mutation-smoke gate was retargeted to engine code — it now proves teeth on the
  state writer (`update-state.ts`) and the assertion shield instead of the deleted
  `src/forge/rbac.ts`. Added `update-state.ts --remove` to delete backlog rows.

### Security
- **assertion-shield: closed 7 diff-header fail-opens.** A gutted test could slip past the
  anti-coverage-erosion gate via a one-line gitconfig/attribute (`diff.noprefix`,
  `diff.mnemonicPrefix`, `diff.srcPrefix`/`dstPrefix`, `core.quotepath`, `color.ui`,
  `diff.external`, `.gitattributes -diff`) or a space-in-path. The shield now forces canonical diff
  output. Caught mid-fix by the engine's own security review (BLOCK→fix→re-review). (PR #107)
- **path-authz: closed two scope bypasses.** `NotebookEdit` writes skipped per-feature
  authorization (both guards read only `file_path`), and `--paths './scripts/**'` could rescope a
  feature onto the gate scripts. Both closed; the review caught a regression in the first cut. (PR #108)
- **CI dependency audit.** `npm audit --omit=dev --audit-level=high` now gates every PR (baseline
  0 vulnerabilities). (PR #111)

### Added
- **Harness-property gauntlet (`bench/suite/G1`–`G4`).** A "3DMark for orchestration" stressing the
  loop itself — output discipline, long-context cross-cutting trace, a mandated
  Read→Plan→Write→Validate DAG, and an unresolvable-environment circuit-breaker (write `BLOCKED.md`,
  halt). All four validity-gated and dogfooded `pass^2`; grounded in real 2026 eval literature
  (`bench/HARNESS-RESEARCH.md`). (PR #105)
- **Metrics-completeness signal.** `update-state.ts --validate` now WARNs (non-fatal) when a
  shipped feature has no `metrics.jsonl` record, so `/kaizen` + `/status` sampling gaps surface
  instead of drifting silently. (PR #109)

### Docs
- README: a "Why a harness, not a framework" section (the harness-as-independent-variable
  rationale) and a formatter-not-enforced honesty note.
- `bench/HARNESS-RESEARCH.md`: live-verified grounding for the gauntlet design plus a catalogue of
  the fabricated/misattributed citations kept out of the repo.
- Reviewer-feedback triage recorded in `roadmap/DECISIONS.md` — what was fixed vs already-mitigated
  vs deliberately deferred (with trigger conditions in `docs/optional-modules.md`).

---

*Process note: every change above shipped through the engine's own loop — a green
`scripts/verify.sh` (typecheck · lint · 367 hook-contract tests · mutation-smoke · state-validate),
the 7 benchmark validity gates, and CI-gated PR merges to `develop`. Security-sensitive guard
changes additionally went through a fresh-context security review.*
