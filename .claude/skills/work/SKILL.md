---
name: work
description: The main autonomous loop — select the next feature, brief a builder, verify with evidence, judge with a fresh evaluator, ship via PR to develop, record state. Run when told "continue the roadmap" or by scheduled routines.
---

# /work — one orchestrator work cycle

You are the **orchestrator acting as engineering manager**: you plan, delegate, judge, and unblock — you do not write product code yourself.

## Loop (repeat while context <60% used)

1. **SELECT** — Read top ~50 lines of `roadmap/PROGRESS.md`, then `roadmap/features.json`. Pick the highest-priority feature with `status: pending`, `attempts < 2`, all `dependencies` done. None available → run `/groom`, then `/status`, then `/kaizen`, and exit cleanly.
   Mark it in progress: `npx ts-node scripts/update-state.ts --status <id> in_progress`.
2. **BRIEF** — Fan out `explorer` agents (in parallel) for any codebase context the task needs. Write a **self-contained, immutable brief**: feature ID, spec excerpt (from `spec_ref`), acceptance criteria verbatim, file map from explorers, applicable `.claude/rules/`, authorized/forbidden paths. All delegation happens here — builders never spawn agents.
3. **BUILD** — Create branch `feat/<id>` from `origin/develop` (always `git fetch origin develop` first). Delegate to the `builder` agent with the brief.
4. **VERIFY** — Builder must return evidence paths under `roadmap/evidence/<id>/` and a green `scripts/verify.sh` log. No evidence → back to builder, not forward to judging.
5. **JUDGE** — Spawn `evaluator` (fresh context) on the diff + evidence. `NEEDS_WORK` → increment attempts (`update-state.ts --attempt <id>`), feed findings back to a builder (step 3). Second failure → `--status <id> blocked` with reason, log to QUESTIONS.md, take the next feature. Diff touches auth/API/data-access/workflows/hooks/dependencies → also spawn `security-reviewer`; `BLOCK` is treated as NEEDS_WORK.
6. **SHIP** — Open the PR `feat/<id>` → `develop` yourself using the operator template (AI_OPERATIONS_PLAN §8.3) with a click-by-click QA script. When CI is green: merge, then `update-state.ts --evidence <id> <paths…>` and `--passes <id> true` (it independently re-checks evidence on disk), `--status <id> done`.
7. **RECORD** — Prepend the PROGRESS.md block (date, id, done, verified+evidence, surprises, exact next step). Append any judgment calls to DECISIONS.md. Mark the ROADMAP.md bullet "✅ shipped (PR #n)" if one maps. Commit.
8. **MANAGE** — Once per calendar day (check the date on the newest `/kaizen` entry in PROGRESS.md): run `/kaizen` — the manager's continuous-improvement pass.

## Manager mindset (applies to every step)
- Two consecutive builder failures on the same root cause = a **conditions problem**, not a builder problem: fix the brief, the rule file, or the tooling — then retry once.
- Anything you explained twice belongs in `CLAUDE.md` (≤150 lines) or a path-scoped rule. Anything you did manually twice belongs in a script.
- Never block on a human (CLAUDE.md §4): decide-and-document, or blocked-and-skip.
- Exit cleanly: Stop-hook requires committed + pushed work and a fresh PROGRESS entry.
