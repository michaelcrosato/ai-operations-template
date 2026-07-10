# Contributing

Thanks for your interest. This repository is unusual: **every line of code is written by AI agents** operating under the rules in [`CLAUDE.md`](CLAUDE.md) and [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md). The human operator plans and does final QA; the agents build, verify, and ship. Contributions are welcome, but they are accepted against **objective bars**, not taste.

## Before you start

- **Discuss first.** Open an issue (bug report, feature request, or agent-failure report) describing the change. For anything non-trivial, wait for a maintainer to confirm it fits the roadmap before writing code — work that conflicts with the operating model will be declined regardless of quality.
- **Claim your slot.** Comment on the issue to say you're working on it, so two people don't build the same thing. If an issue goes quiet for two weeks, it's open again.
- **One change per PR.** Keep PRs scoped to a single feature or fix.

## The acceptance bar (objective, not negotiable)

A PR is mergeable only when **all** of these hold:

1. **The gate is green.** `bash scripts/verify.sh` passes (add `--e2e` for UI changes). CI re-runs this on every PR; a locally-green log is not enough.
2. **Tests, not assertions removed.** New behavior ships with tests. The assertion shield blocks PRs that delete or weaken existing test assertions — do not bypass it; fix the underlying issue.
3. **State is not hand-edited.** Never edit `roadmap/features.json` by hand — use `scripts/update-state.ts`.
4. **It targets `develop`.** All PRs go to `develop`, never `main`/`master`. Branches are named `feat/F-XXXX` or `fix/...`.
5. **Plain-English PR description.** Use the PR template: what it does, how to see it (click-by-click), what could be risky, and the machine checks that passed.
6. **No new secrets, no production access, synthetic data only.**

## Local setup

```bash
bash scripts/init.sh        # install + bootstrap
bash scripts/verify.sh      # the gate (typecheck + lint + tests + state + shield)
```

On Windows, run these through **Git Bash** (not WSL bash) or use `scripts/verify.ps1`, which locates Git Bash for you. See the cross-platform notes in `README.md`.

## What gets declined

- Changes that weaken a guardrail (gate, hook, shield) without a documented, reviewed reason.
- New runtime dependencies that are not justified.
- Refactors with no behavioral test coverage.
- Anything that makes operator-facing output (STATUS.md, PR text, QA packs) less plain-English.

By contributing, you agree your contributions are licensed under the same terms as this repository.
