# Changelog

All notable changes to the **ai-operations-engine** template, newest first. This is the
human-readable companion to `roadmap/PROGRESS.md` (narrative) and `roadmap/DECISIONS.md` (one entry
per judgment call) — it summarizes what an adopter or operator would care about. Format follows
[Keep a Changelog](https://keepachangelog.com/). The template is rolling (latest `develop` + tag
`v0.1.0`), so changes accrue under **Unreleased** until a tag is cut.

## [Unreleased]

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

### Changed
- **E2E auto-runs on UI changes.** CI now triggers the Playwright suite on `app/**` and
  `components/**` (previously only `src/**`), so demo-surface changes can't skip E2E. (PR #111)
- **ForgeOps demo labeled as a simulated mockup.** The landing page now leads with an
  above-the-fold "Simulated demo" banner and an "INTERACTIVE DEMO (SIMULATED)" badge, and its hero
  copy names the mocked surfaces (mocked counters, a *starter* export scaffold) — closing the
  unanimous reviewer note that the hero read as a shipping product. (this pass)

### Docs
- README: a "Why a harness, not a framework" section (the harness-as-independent-variable
  rationale), a formatter-not-enforced honesty note, and the demo-labeling update.
- `bench/HARNESS-RESEARCH.md`: live-verified grounding for the gauntlet design plus a catalogue of
  the fabricated/misattributed citations kept out of the repo.
- Reviewer-feedback triage recorded in `roadmap/DECISIONS.md` — what was fixed vs already-mitigated
  vs deliberately deferred (with trigger conditions in `docs/optional-modules.md`).

---

*Process note: every change above shipped through the engine's own loop — a green
`scripts/verify.sh` (typecheck · lint · 350+ hook-contract tests · mutation-smoke · state-validate),
the 7 benchmark validity gates, and CI-gated PR merges to `develop`. Security-sensitive guard
changes additionally went through a fresh-context security review.*
