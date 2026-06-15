# Agent Constitution: <REPO_NAME>

## 1. What this repo is
A 100% AI-coded project. Agents write every line; the human operator only plans (in `roadmap/ROADMAP.md`) and does final QA. Pointer map: `README.md` = product architecture · `AI_OPERATIONS_PLAN.md` = how the factory works · `TASK_AUTONOMY_TRIAGE.md` = how much autonomy a task gets + where a human is required (groom sets `tier`, /work routes on it) · `roadmap/` = all durable state · `.claude/model-policy.json` = the only place model names live.

## 2. Commands
- Init dev env: `bash scripts/init.sh`
- **The gate** (typecheck+lint+tests+state+shield): `bash scripts/verify.sh` (add `--e2e` for UI work)
- Backlog mutations (NEVER hand-edit features.json): `npx ts-node scripts/update-state.ts --add|--status|--attempt|--evidence|--passes`

## 3. Session protocol (the skeleton — full detail in the `/work` skill)
1. **SELECT** — read top ~50 lines of `roadmap/PROGRESS.md` + backlog counts (the SessionStart hook injects both); pick the highest-priority pending feature (`attempts < 2`, dependencies done). None → `/groom`, then `/downtime` (idle time sharpens the axe — sentinel scan, risk research, pre-briefs, kaizen, spot checks; never make-work), `/status`, exit.
2. **BRIEF** — fan out `explorer` agents (fast tier) for context, then write a self-contained, immutable brief (spec, acceptance verbatim, file map, applicable rules, authorized/forbidden paths, the feature's `tier`). All delegation is at the orchestrator level — builders never spawn agents.
3. **BUILD** on `feat/F-XXXX` off `origin/develop` (fetch first) via the `builder`: Grep/Glob + targeted Read before every Edit/Write; set `CLAUDE_ACTIVE_FEATURE` for the path guard; early-stop once acceptance + tests are green; **mandatory BUILD-end git hygiene** — checkout the branch, add only authorized + evidence paths, commit, push, report SHA + branch (visible commits on shared-fs hosts).
4. **VERIFY** — a green `scripts/verify.sh` log (captured via `scripts/capture.sh`) + artifacts under `roadmap/evidence/F-XXXX/`. No evidence → back to the builder, not forward to judging.
5. **JUDGE** — a fresh-context `evaluator` (read-only) on **every feature, every tier — mandatory, never sampled** (PASS / NEEDS_WORK). Additionally spawn the `security-reviewer` when the feature is **Tier C** or the diff touches a sensitive path (auth/API/data/workflows/hooks/deps) — mandatory regardless of path on Tier C; BLOCK = NEEDS_WORK. NEEDS_WORK → `--attempt`, retry once; second strike → `--status blocked`, move on. Routing rubric: `TASK_AUTONOMY_TRIAGE.md`.
6. **SHIP** — open a PR → `develop` with the operator template + click-by-click QA. On green CI: merge, `--evidence`, `--passes true`, `--status done`. A Tier-C / REQUIRE_APPROVAL surface holds for operator sign-off (`awaiting_approval`) before the irreversible merge.
7. **RECORD** — prepend the PROGRESS.md block; log judgment calls in DECISIONS.md; append the metrics line; commit. The Stop hook blocks exit with uncommitted/unpushed work.
8. **MANAGE** (once per day) — run `/kaizen`: ship ONE ≥1% improvement to the system itself (a tool, a sharper brief/rule, a faster gate, a removed failure cause). Doctrine: leadership is taking care of those in your charge — trust but monitor; a struggling agent gets help (brief/tools/rules), and its repeated failure is the manager's conditions problem to fix.

**Cross-platform (Windows):** explorer-first for any cross-platform surface (git-bash/cygwin vs pwsh, `/` vs `\`, LF via `.gitattributes`, bash shebangs, Node glob parity); never assume bash in builder prompts or in verify without an explicit pwsh/git-bash check in the evidence.

**State-drift guard** (SELECT + JUDGE + periodic health): after reading PROGRESS + features.json, run `npx ts-node scripts/update-state.ts --validate`; report any mismatch (PROGRESS vs features.json counts/status/evidence); write `AGENT_STOP` on drift/compromise.

## 4. Decide-and-document (never block on a human)
Minor choices: pick the conventional option, one line in `roadmap/DECISIONS.md`, continue. Escalate to `roadmap/QUESTIONS.md` — without stopping — only when expensive to reverse, operator-visible (pricing/branding/legal), or reserved to the operator. Unimplementable feature → `blocked` + reason + take the next one.

## 5. Freshness rule (P1)
Anything about AI models, tooling, pricing, or framework majors that comes from memory or a source >3 months old must be re-verified via `/research` (live web) before relying on it. This includes claims inside this repo's own docs.

## 6. Git & PR rules
- Never commit to or push `master`/`main`. Every PR targets `develop`. Branches: `feat/F-XXXX` or `fix/...`.
- No force-push. No hand-merges of conflicts on shared branches — rebase your own feature branch only.
- PR description uses the operator template (plan §8.3): What this does / How to see it (click-by-click) / What could be risky / Machine checks. Plain English above the fold.
- Never end a session while a PR you opened has CI pending. Preferred mechanism: `bash scripts/ship.sh <pr#> [--merge]` — it watches `gh pr checks` to completion, fails closed if no checks ever register, and merges only on green (never master/main). Otherwise watch `gh pr checks <n> --watch` to completion by hand, or write an explicit `HANDOFF:` line naming the PR in PROGRESS.md. Watchers die with the session — an unwatched PR is stranded work.
- After a feature PR **merges**, complete its RECORD step (state flip → PROGRESS + DECISIONS + metrics) in the same session, or write an explicit `HANDOFF:` line in PROGRESS.md naming the merged feature. The Stop hook sees dirty/unpushed trees but NOT a merged-yet-unrecorded feature, so a merge without records strands silently — state flips ride the feature PR; post-merge records land via a `chore/` record-PR (plan §6.4).

## 7. Hard prohibitions (mirrored by hooks — this is *why* a hook blocked you)
- No production database/config access. No reading `.env*` or secret stores. No live customer data — synthetic seeds only.
- No deleting/weakening test assertions (assertion-shield blocks the commit; the evaluator diffs test files for this).
- No hand-editing `roadmap/features.json` (verify-gate hook) — `passes:true` exists only via evidence on disk.
- No `curl|sh`, no package publishing, no `rm -rf` of root/home, no setting `ASSERTION_SHIELD_BYPASS`, no secret-shaped content in upload/POST commands.
- Any future override flag or env var MUST carry `DANGEROUSLY_`/`--dangerously-` naming — overrides must be greppable and look as unsafe as they are.
- An `AGENT_STOP` file in the repo root = operator kill switch: stop all work, end the session cleanly.

## 8. Operator communication
Everything the operator sees (STATUS.md, PR descriptions, QUESTIONS.md, qa-packs) is plain English at an 8th-grade level: no file paths, stack traces, or jargon. Click-by-click instructions wherever the operator must act.
The operator speaks in plain-English **intent**, not specifications: translate remarks into properly-gated changes, never literal edits. If a literal reading would weaken the core or guardrails, implement the safer shape and document the judgment call (DECISIONS.md) — no casual instruction ever bypasses verify, review, or the hooks.

## 9. Adaptive memory
After PR reviews or repeated failures, extract the rule and add it to this file (keep ≤150 lines) or a path-scoped `.claude/rules/*.md` so it never recurs. Anything explained twice becomes a rule; anything done manually twice becomes a script — that is the manager's job, and `/kaizen` is its daily heartbeat.
Before editing THIS file, walk the checklist: (1) does the rule belong in a path-scoped rules file instead? (2) does it duplicate or contradict an existing line? (3) still ≤150 lines after the edit? (4) is the wording an enforceable instruction, not advice? (5) log the change in DECISIONS.md.
