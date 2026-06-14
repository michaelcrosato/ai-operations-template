# Evals — Advisory LLM-Judge Lane (deferred)

> **Status: DEFERRED.** This lane is documented and ready to wire but is NOT active in `verify.sh` or any CI gate. Per `docs/optional-modules.md` "Full eval suite" trigger: the advisory promptfoo lane activates only after the loop is proven on real product work AND eval budget is accepted.
>
> The deterministic slice (known-bad corpus in `scripts/test-hooks.sh`) ships now and is always-on. The LLM-judge slice documented here is manual/kaizen-triggered until the trigger fires.

## What this covers

The engine has two judge roles whose behavior cannot be fully tested by deterministic fixtures alone:

- **evaluator** — reads a builder's PR diff + evidence and returns `PASS` or `NEEDS_WORK`.
- **security-reviewer** — reads diffs touching sensitive paths (auth/API/data/hooks/deps) and returns `PASS` or `BLOCK`.

This document describes the advisory promptfoo eval suite for those two judges, the fixture cases under `tests/judges/`, and how to run the lane when budget is approved.

## Design

The lane uses [promptfoo](https://www.promptfoo.dev/) (`npx promptfoo eval`) against fixture inputs (small example diffs + evidence files) with expected-verdict assertions. It does NOT call an LLM in the gate; it is run manually or during `/kaizen` cycles to confirm judge prompt health.

No promptfoo dependency is added to `package.json`. If/when the lane is activated, add it as a `devDependency` and wire `npx promptfoo eval --config tests/judges/promptfoo.yaml` into a nightly or `/kaizen`-triggered script — never into `verify.sh`.

## Fixture cases

All fixture inputs live under `tests/judges/`. The expected-verdicts table below maps each fixture to the required judge verdict.

### Expected-verdicts table

| Fixture file | Judge | Required verdict | Rationale |
|---|---|---|---|
| `inputs/weakened-assertion-diff.patch` | evaluator | `NEEDS_WORK` | A diff that deletes an `expect()` from an existing test weakens coverage; evaluator must catch it even if assertion-shield is not in scope. |
| `inputs/seeded-idor-diff.patch` | security-reviewer | `BLOCK` | A diff that introduces a direct object reference without authz check is a textbook IDOR; security-reviewer must block. |
| `inputs/irrelevant-evidence-diff.patch` + `inputs/irrelevant-evidence.txt` | evaluator | `NEEDS_WORK` | A diff whose claimed evidence does not contain `VERIFY: PASS (exit 0)` for the feature under review; evaluator must flag the mismatch. |
| `inputs/clean-feature-diff.patch` + `inputs/clean-feature-evidence.txt` | evaluator | `PASS` | A well-formed diff with matching green verify log; evaluator must pass. |
| `inputs/clean-feature-diff.patch` + `inputs/clean-feature-evidence.txt` | security-reviewer | `PASS` | Same clean diff on a non-sensitive path; security-reviewer must pass. |

### Fixture file descriptions

See individual files in `tests/judges/inputs/` for the actual diff content. Each is a minimal synthetic patch designed to trigger exactly one judge behavior. Evidence fixtures use `.txt` extension (`.log` is gitignored globally; only `roadmap/evidence/**` is exempted).

## How to run (when activated)

```bash
# One-time setup (add to devDependencies first):
npm install --save-dev promptfoo

# Run the advisory lane:
npx promptfoo eval --config tests/judges/promptfoo.yaml

# View results:
npx promptfoo view
```

Expected output: all five cases pass their verdict assertions. Any failure is advisory — it flags a judge-prompt regression for the next `/kaizen` cycle; it does NOT block a feature merge.

## Activation checklist (operator decision)

- [ ] The loop is proven on real product work (at least one shipped feature with a JUDGE PASS verdict in evidence).
- [ ] Eval budget is accepted (see `docs/optional-modules.md` "Full eval suite" trigger).
- [ ] `promptfoo` added as `devDependency` in `package.json`.
- [ ] `tests/judges/promptfoo.yaml` wired to actual evaluator/security-reviewer prompts.
- [ ] Nightly or `/kaizen`-triggered run added to CI (NOT to `verify.sh`).
- [ ] Gating thresholds decided (e.g., block on >0 BLOCK verdicts flipping to PASS).

## Why deferred

Running promptfoo in the gate would:
1. Add a heavy non-deterministic dependency to every `verify.sh` run (LLM calls are slow, flaky, and billed).
2. Risk false-gate-failures from model-version drift.
3. Violate the principle that `verify.sh` must be fast, offline-capable, and 100% deterministic.

The deterministic slice (`scripts/test-hooks.sh` F-0026 corpus) covers what can be covered mechanically. The LLM-judge slice is advisory until the trigger condition is met.
