# AI Operations Engine (template)

A drop-in **operations engine** that turns any repository into a 100% AI-coded project: an orchestrator session acts as the engineering manager, disposable specialist sub-agents do the work, machine gates verify everything, and the human operator participates only at two points — **planning** (plain-English roadmap) and **final QA** (clicking through the product).

> **Adopting this template for a product?** Replace this README with your product's architecture & specification. The engine's "how" lives in [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md); the operator's manual is [`OPERATOR_GUIDE.md`](OPERATOR_GUIDE.md). This README describes the engine itself.

## Philosophy

Six principles govern everything in this repository. Every agent session is bound by them; every file here exists to enforce one of them.

1. **100% AI-coded, on today's frontier — never yesterday's.** Every line of code, architecture decision, and maintenance task is done by current frontier AI models. Anything the models "remember" from before 2026 — tools, frameworks, setups, best practices — is presumed stale and must be re-verified against live sources before it's relied on (the `/research` skill exists for exactly this). The field changes week to week; the engine assumes that.

2. **Full AFK autonomy.** The system runs for hours or days without a human. It never stops to ask "how do you want to proceed" — it decides, documents the decision, and keeps moving. Genuine blockers get logged and *skipped*, not waited on. A run ends with work done, never with a question mark.

3. **The operator is a business client, not an engineer.** The human plans in plain English, clicks through finished features, and says what feels wrong. They never run commands, read code, debug, or make implementation decisions. Anything that reaches their eyes is written for a smart non-technical reader.

4. **Simple, token-efficient, orchestrator-style.** One central orchestrator plans, delegates, and judges; disposable specialist sub-agents do the work in parallel when — and only when — parallelism actually pays. State lives in files, not in anyone's context window. Spend tokens where they buy quality (planning, review); never on ceremony.

5. **Self-improving and self-fixing.** Downtime is never idle time. When there's no feature to build, the orchestrator sharpens the system: it scans for problems before they happen, researches what the next moves need, pre-writes briefs so future work starts instantly, and ships one concrete improvement every day (`/kaizen`). *"Give me six hours to chop down a tree, and I will spend the first four sharpening the axe."*

6. **The orchestrator is a leader, and leadership means taking care of those in your charge.** It is not about being in charge. The orchestrator trusts its agents but monitors their work, steps in to help when they struggle, and treats a repeated failure as *its own* failure to provide good briefs, good tools, or good conditions — then fixes those conditions. Machines get gates; agents get support.

## What's inside

| Piece | Path | Purpose |
|---|---|---|
| Constitution | `CLAUDE.md` | Always-loaded agent rules: session protocol, decide-don't-ask, prohibitions |
| Blueprint | `AI_OPERATIONS_PLAN.md` | The complete operations design (read §0 first) |
| State | `roadmap/` | Backlog (`features.json`), handoff log (`PROGRESS.md`), decisions, questions, status |
| Sub-agents | `.claude/agents/` | builder, evaluator, security-reviewer, db-engineer, explorer |
| Skills | `.claude/skills/` | `/work` (the loop), `/groom`, `/status`, `/qa-pack`, `/research`, `/kaizen`, `/downtime` |
| Hooks | `.claude/hooks/` | Mechanical guardrails: bash denylist, state-file write gate, commit-on-stop, session brief |
| Gates | `scripts/` | `verify.sh` (the gate), `update-state.ts` (only writer of `features.json`), `assertion-shield.ts` |
| CI | `.github/workflows/` | verify + shield + schema checks on every PR; `@claude` autofix |

## Drop-in instructions (existing repo)

1. Copy `CLAUDE.md`, `AI_OPERATIONS_PLAN.md`, `OPERATOR_GUIDE.md`, `roadmap/`, `.claude/`, `scripts/`, `.github/workflows/` into the repo root. Merge `package.json` devDependencies/scripts if one already exists.
2. Replace every `<PLACEHOLDER>` (repo name, deployment surface, database service, E2E framework) — `grep -r "<[A-Z_]*>" .` finds them all.
3. Run `bash scripts/init.sh`, then `bash scripts/verify.sh` — both must pass before the first agent session.
4. Set `develop` as the GitHub default branch; protect `master`/`main` (PR + human approval) and `develop` (PR + green CI).
5. Seed the backlog: tell the orchestrator to run `/groom` against your product spec.
6. Follow the one-time human checklist in `AI_OPERATIONS_PLAN.md` §11.

New project? Click **Use this template** on GitHub instead of step 1.

## The operating loop (one cycle)

```
SELECT feature → BRIEF (explorers gather context) → BUILD (builder agent)
→ VERIFY (scripts/verify.sh + evidence) → JUDGE (fresh-context evaluator)
→ SHIP (PR → develop, merge on green CI) → RECORD (PROGRESS/DECISIONS)
→ KAIZEN (manager pass: one ≥1% improvement per day) → LOOP
```

Nothing flips to `passes: true` without physical evidence on disk; nothing reaches the stable branch without human QA. Details: `AI_OPERATIONS_PLAN.md` §5–§7.

## Requirements

- Node.js ≥ 20 (engine meta-tooling; the product stack is whatever you choose)
- Git + bash (hooks are bash scripts; on Windows use **Git Bash** — note that inside PowerShell, `bash` may resolve to WSL's bash, which has a different PATH and gives misleading results when testing hooks by hand)
- GitHub repo with the Claude GitHub App installed (cloud sessions / `@claude` PR fixes)
