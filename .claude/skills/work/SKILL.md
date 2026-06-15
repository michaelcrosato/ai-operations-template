---
name: work
description: The main autonomous loop — select the next feature, brief a builder, verify with evidence, judge with a fresh evaluator, ship via PR to develop, record state. Run when told "continue the roadmap" or by scheduled routines.
---

# /work — one orchestrator work cycle

You are the **orchestrator acting as engineering manager**: you plan, delegate, judge, and unblock — you do not write product code yourself.

**Working rules (apply in every phase):**
- **Explorer-first for research:** fan out `explorer` agents (fast tier) BEFORE any builder or deep read in BRIEF/research/kaizen/downtime. Use Grep/Glob + targeted `Read` (offset/limit) before every Edit/Write or full-file op.
- **Share context, don't duplicate:** pass the relevant context into each sub-agent's prompt rather than having each re-derive it.
- **Report, don't dump:** every sub returns its conclusions + the exact files/line-refs and evidence paths it touched, plus an approximate tool-call count and any errors — never raw file dumps. Judges are read-only.
- **Windows:** run `scripts/verify.sh` and git ops from full Git Bash (not WSL bash).

## Loop (repeat while context < 60% used)

1. **SELECT** — Read top ~50 lines of `roadmap/PROGRESS.md`, then `roadmap/features.json`. Pick the highest-priority feature with `status: pending`, `attempts < 2`, all `dependencies` done. None available → run `/groom`, then the `/downtime` protocol (sentinel scan, risk research, pre-briefing, kaizen, spot checks), then `/status`, and exit cleanly.
   - **State-drift guard:** after reading PROGRESS + features.json, run `npx ts-node scripts/update-state.ts --validate`; report any mismatch (PROGRESS vs features.json counts/status/evidence) and write an `AGENT_STOP` file on drift/compromise.
   - Mark it in progress: `npx ts-node scripts/update-state.ts --status <id> in_progress`.
2. **BRIEF** — Use the pre-written brief at `roadmap/briefs/<id>.md` if a `/downtime` pass already sharpened it (verify it's still current). Otherwise: fan out `explorer` agents (in parallel) for the codebase context the task needs and write a **self-contained, immutable brief**: feature ID, spec excerpt (from `spec_ref`), acceptance criteria verbatim, file map from explorers, applicable `.claude/rules/`, authorized/forbidden paths, and the feature's **tier** (`TASK_AUTONOMY_TRIAGE.md`). The four hours sharpening the axe ARE the six hours chopping — a thin brief is the root cause of most builder failures. All delegation happens here — builders never spawn agents.
3. **BUILD** — Create branch `feat/<id>` from `origin/develop` (always `git fetch origin develop` first). Delegate to the **tier's builder agent** (model-switching, `.claude/model-policy.json`): **Tier C → `builder-strong`** (reasoning/opus — reasoning-critical, irreversible, or novel work); **Tier A/B → `builder`** (sonnet). Each agent's model is fixed by its frontmatter (synced from policy by `scripts/check-model-policy.ts`) — there is no per-invocation model override in the CLI/Actions lanes, so the model is selected by *which* builder you spawn. The builder's contract: Grep/Glob + targeted read before every edit; set `CLAUDE_ACTIVE_FEATURE=<id>` for the path guard; early-stop once acceptance + tests are green; and a **mandatory end-of-build git-hygiene step** — `git checkout -b feat/<id>` (or check it out), `git add` only authorized paths + `roadmap/evidence/<id>/*`, `git commit`, `git push`, and report the SHA + branch (shared-filesystem hosts need this for visible commits). If the sub reports success but the host shows untracked files from the sub, the orchestrator performs the capture/hygiene commit on `feat/<id>`.
4. **VERIFY** — Builder must return evidence paths under `roadmap/evidence/<id>/` and a green `scripts/verify.sh` log (capture it with `scripts/capture.sh` — never tee verify output directly onto an evidence path `features.json` already references; the gate's evidence audit reads that file mid-run, so write to a temp file then move it in after the run exits green — learned on PR #14). No evidence → back to builder, not forward to judging.
5. **JUDGE** — Spawn the `evaluator` (fresh context, read-only) on the diff + evidence. **The evaluator is mandatory on every feature, every tier — never sampled.** `NEEDS_WORK` → increment attempts (`update-state.ts --attempt <id>`), feed findings back to a builder (step 3). Second failure → `--status <id> blocked` with reason, log to `QUESTIONS.md`, take the next feature.
   - **Tier-routed security review (`TASK_AUTONOMY_TRIAGE.md`):** also spawn the `security-reviewer` when the feature is **Tier C** OR the diff touches a sensitive path (auth/API/data-access/workflows/hooks/dependencies). For Tier C it is **mandatory regardless of path**. `BLOCK` is treated as `NEEDS_WORK`.
   - Surface the exact test pass/fail counts from the verify/contract logs into the JUDGE directive, and confirm the `VERIFY: PASS (exit 0)` marker is present.
6. **SHIP** — Open the PR `feat/<id>` → `develop` yourself using the operator template (`AI_OPERATIONS_PLAN.md §8.3`) with a click-by-click QA script. When CI is green: merge, then `update-state.ts --evidence <id> <paths…>`, `--passes <id> true` (it independently re-checks evidence on disk), `--status <id> done`. *(Tier-C REQUIRE_APPROVAL merge gate — hold the irreversible/visible surface for operator sign-off — lands with the `awaiting_approval` status; until then a Tier-C feature still routes through the mandatory security-reviewer above.)*
7. **RECORD** — Prepend the PROGRESS.md block (date, id, done, verified + evidence, surprises, exact next step). Append any judgment calls to DECISIONS.md. Append one metrics record to `roadmap/metrics.jsonl` — single line, schema: `{"date":"YYYY-MM-DD","feature":"F-XXXX","attempts":n,"evaluator":"PASS|NEEDS_WORK->PASS","security":"APPROVE|BLOCK->APPROVE|skipped-per-sensitivity-rule","findings_fixed":n,"pr":n,"notes":"one line"}` (validated by `--validate`; malformed records fail the gate). Mark the ROADMAP.md bullet "✅ shipped (PR #n)" if one maps. Commit.
8. **MANAGE** — Once per calendar day (check the date on the newest `/kaizen` entry in PROGRESS.md): run `/kaizen` — the manager's continuous-improvement pass.

## Manager mindset (applies to every step)
- **Leadership is not about being in charge; it is about taking care of those in your charge.** Trust your agents but monitor their work (spot-check evidence, don't just read reports); when one struggles, your first move is to help — a better brief, a missing tool, a clearer rule — not to blame or silently redo their work yourself.
- Two consecutive builder failures on the same root cause = a **conditions problem**, not a builder problem: fix the brief, the rule file, or the tooling — then retry once.
- Anything you explained twice belongs in `CLAUDE.md` (≤150 lines) or a path-scoped rule. Anything you did manually twice belongs in a script.
- Never block on a human (CLAUDE.md §4): decide-and-document, or blocked-and-skip.
- Exit cleanly: the Stop hook requires committed + pushed work and a fresh PROGRESS entry.
