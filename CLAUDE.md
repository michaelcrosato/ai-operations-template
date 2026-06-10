# Agent Constitution: <REPO_NAME>

## 1. What this repo is
A 100% AI-coded project. Agents write every line; the human operator only plans (in `roadmap/ROADMAP.md`) and does final QA. Pointer map: `README.md` = product architecture · `AI_OPERATIONS_PLAN.md` = how the factory works · `roadmap/` = all durable state · `.claude/model-policy.json` = the only place model names live.

## 2. Commands
- Init dev env: `bash scripts/init.sh`
- **The gate** (typecheck+lint+tests+state+shield): `bash scripts/verify.sh` (add `--e2e` for UI work)
- Backlog mutations (NEVER hand-edit features.json): `npx ts-node scripts/update-state.ts --add|--status|--attempt|--evidence|--passes`

## 3. Session protocol (detail: /work skill)
1. Read top ~50 lines of `roadmap/PROGRESS.md` + backlog counts (the SessionStart hook injects both).
2. SELECT highest-priority pending feature: `attempts < 2`, dependencies done. None → `/groom`, `/status`, `/kaizen`, exit.
3. BRIEF: fan out `explorer` agents for context; write a self-contained immutable brief. All delegation happens at orchestrator level — builders never spawn agents.
4. BUILD on branch `feat/F-XXXX` from `origin/develop` (fetch first) via the `builder` agent.
5. VERIFY: green `scripts/verify.sh` log + artifacts saved to `roadmap/evidence/F-XXXX/`.
6. JUDGE: fresh-context `evaluator` (PASS/NEEDS_WORK). Sensitive paths (auth/API/data/workflows/hooks/deps) also get `security-reviewer`. NEEDS_WORK → `--attempt`, retry once; second strike → `--status blocked`, move on.
7. SHIP: open PR → `develop` with the operator template + click-by-click QA script. On green CI: merge, `--evidence`, `--passes true`, `--status done`.
8. RECORD: prepend PROGRESS.md block; log judgment calls in DECISIONS.md; commit. The Stop hook blocks exit with uncommitted/unpushed work.
9. MANAGE (once per day): run `/kaizen` — ship ONE ≥1% improvement to the system itself (a tool, a better brief/rule, a faster gate, a removed failure cause).

## 4. Decide-and-document (never block on a human)
Minor choices: pick the conventional option, one line in `roadmap/DECISIONS.md`, continue. Escalate to `roadmap/QUESTIONS.md` — without stopping — only when expensive to reverse, operator-visible (pricing/branding/legal), or reserved to the operator. Unimplementable feature → `blocked` + reason + take the next one.

## 5. Freshness rule (P1)
Anything about AI models, tooling, pricing, or framework majors that comes from memory or a source >3 months old must be re-verified via `/research` (live web) before relying on it. This includes claims inside this repo's own docs.

## 6. Git & PR rules
- Never commit to or push `master`/`main`. Every PR targets `develop`. Branches: `feat/F-XXXX` or `fix/...`.
- No force-push. No hand-merges of conflicts on shared branches — rebase your own feature branch only.
- PR description uses the operator template (plan §8.3): What this does / How to see it (click-by-click) / What could be risky / Machine checks. Plain English above the fold.

## 7. Hard prohibitions (mirrored by hooks — this is *why* a hook blocked you)
- No production database/config access. No reading `.env*` or secret stores. No live customer data — synthetic seeds only.
- No deleting/weakening test assertions (assertion-shield blocks the commit; the evaluator diffs test files for this).
- No hand-editing `roadmap/features.json` (verify-gate hook) — `passes:true` exists only via evidence on disk.
- No `curl|sh`, no package publishing, no `rm -rf` of root/home, no setting `ASSERTION_SHIELD_BYPASS`.
- An `AGENT_STOP` file in the repo root = operator kill switch: stop all work, end the session cleanly.

## 8. Operator communication
Everything the operator sees (STATUS.md, PR descriptions, QUESTIONS.md, qa-packs) is plain English at an 8th-grade level: no file paths, stack traces, or jargon. Click-by-click instructions wherever the operator must act.

## 9. Adaptive memory
After PR reviews or repeated failures, extract the rule and add it to this file (keep ≤150 lines) or a path-scoped `.claude/rules/*.md` so it never recurs. Anything explained twice becomes a rule; anything done manually twice becomes a script — that is the manager's job, and `/kaizen` is its daily heartbeat.
