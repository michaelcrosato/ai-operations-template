# AI Operations Engine

**What this repo is for:** a set of instructions that lets frontier-model coding agents do genuinely good work — a supercharged loop of *explore -> plan -> code -> commit.* Everything below exists to make that loop more reliable, efficient, auditable, and self-improving.

## Six principles

Six principles govern everything in this repository. Every agent session is bound by them; every file here exists to enforce one of them.

1. **100% AI-coded, on today's frontier — never yesterday's.** Every line of code, architecture decision, and maintenance task is done by current frontier AI models. Anything the models "remember" from before 6 months ago — tools, frameworks, setups, best practices — is presumed stale and must be re-verified against live sources before it's relied on (the `/research` skill exists for exactly this). The field changes week to week; the engine assumes that.

2. **Full AFK autonomy.** The agents following this system can run indefinitely without a human in the loop. It never stops to ask "how do you want to proceed" — it decides, documents the decision, and keeps moving. Genuine blockers get logged and skipped, not waited on. A run ends with work done, never with a question mark.

3. **The operator is a business client, not an engineer.** The human plans in plain English, clicks through finished features, and says what feels wrong. They never run commands, read code, debug, or make implementation decisions. Anything that reaches their eyes is written for a smart non-technical reader.

4. **Simple, token-efficient, orchestrator-style.** One central orchestrator plans, delegates, and judges; disposable specialist sub-agents do the work in parallel when — and only when — parallelism actually pays. State lives in files, not in anyone's context window. Spend tokens where they buy quality (planning, review); never on ceremony.

5. **Downtime is productive time — the orchestrator sharpens the system.** It monitors progress, fixes problems, looks for opportunities to make adjustments and optimize the process, researches what the next moves need, pre-writes briefs so future work starts instantly, and ships one concrete improvement after another (`/kaizen`). *"Give me six hours to chop down a tree, and I will spend the first four sharpening the axe."*

6. **The orchestrator is a leader — and leadership means taking care of those in your charge, not being in charge.** It trusts its agents but monitors their work, steps in to help when they struggle, and treats a repeated failure as its own failure to provide good briefs, good tools, or good conditions — then fixes those conditions. Machines get gates; agents get support.

---

## What this actually is

> **Read this first.** This repository is **not a product** — it is a *control plane* for building software with frontier AI agents: a state machine, a set of mechanical guardrails, and an adversarial review loop that let AI write and ship code semi-autonomously while staying auditable. It ships as an **engine-only template**: it carries no product code of its own. An adopter drops it into their repo, points it at their product spec, and the factory builds from there. The asset here is the factory.

**Operational status — last verified 2026-06-16 (`develop`):**

| Layer | Status |
|---|---|
| Engine — state machine, gates, `.claude/hooks/`, **350+** hook-contract tests, mutation gate, CI | ✅ **Working** |
| Risk-tier adaptive layer (A/B/C → builder model, review depth, approval gate) | ✅ Machinery built & gate-tested · ⏳ **not yet exercised** on a real feature (the 21 shipped engine features predate it) |
| Benchmark (`bench/`) | ✅ Built & validity-gated — atomic **7/7**; `L1 pass^5`, `L4/G1–G4 pass^2` dogfooded |
| Engine-effect measurement | ⏳ Harness built; **no signal yet** — greenfield tasks already score 1.0, so the next move is refactoring/regression tasks, not bigger greenfield |

---

## The one-paragraph truth (for a skeptical reader)

A working harness lets Claude-based agents take a plain-English backlog item, build it on a branch, run a hard quality gate, get reviewed by a *separate* fresh-context AI judge (and a security reviewer for sensitive or high-risk code), open a PR, and merge only on green CI — with mechanical hooks that block secret reads, destructive commands, pushes to protected branches, and silent deletion of test assertions. Each feature carries a **risk tier** that decides how deeply it's reviewed, which model builds it, and whether a human must approve the merge. Every "done" is backed by an evidence file on disk, and the safety-critical tests are **proven non-vacuous** by a mutation gate (deliberately break the code, require a test to catch it). That loop is genuinely novel, it genuinely works, and it sits on the **current (2026) best-practice frontier** for autonomous coding. **What does not exist** is a sellable product, users, or revenue — this is the engineering layer (*how* we build), packaged as a reusable template.

---

## What's real

| Claim | Reality |
|---|---|
| **The AI operations factory** (orchestrator + sub-agents + gates + hooks + state machine + tier-driven adaptive layer) | ✅ **Real and working.** ~3,900 lines of scripts/hooks + a detailed ops design. Mechanical guardrails actually block. This is the IP. |
| **Evidence-gated delivery** (nothing is "done" without proof on disk; `features.json` writable only by one audited script) | ✅ **Real, mechanically enforced.** Hand-editing state is blocked by a hook; faking a pass requires editing the hook itself, which CI re-runs. |
| **Adversarial review** (a fresh-context evaluator + a security reviewer grade each change before merge) | ✅ **Real, and it has caught real bugs** — a bypass hole in a guardrail fix and a state-machine birth-status hole, both rejected before merge. |
| **Tests have teeth** (mutation gate proves the safety-critical tests aren't vacuous) | ✅ **Real.** 350+ hook-contract tests + a mutation-smoke gate that kills known mutants across the state writer and the assertion shield. |

---

## The loop (one cycle)

```
SELECT a pending feature (priority, deps met, attempts < 2)
→ BRIEF   (fast explorer agents gather context; the brief states the feature's risk TIER)
→ BUILD   (a tier-routed builder agent, on a feat/ branch, scoped to its authorized paths)
→ VERIFY  (scripts/verify.sh: typecheck + lint + tests + state-validate + model-policy drift
           + mutation-smoke + guards; evidence captured to roadmap/evidence/<id>/)
→ JUDGE   (a fresh-context evaluator on EVERY feature, every tier — never sampled;
           + a security reviewer, mandatory on Tier C or any auth/data/deps/CI/hooks diff)
→ SHIP    (PR → develop, merge on green CI — EXCEPT a Tier-C/irreversible surface, which
           parks `awaiting_approval` for human sign-off while the loop keeps moving)
→ RECORD  (progress / decisions / metrics) → KAIZEN (one ≥1% system improvement) → LOOP
```

## The adaptive layer (how it modulates by risk, not difficulty)

Every feature is assigned a tier **A/B/C** at groom time, gated on **consequences** (irreversibility × blast radius), per [`TASK_AUTONOMY_TRIAGE.md`](TASK_AUTONOMY_TRIAGE.md). The tier — and only the tier — modulates three axes. The independent evaluator stays **mandatory and unsampled** on all of them:

- **Loop-switching (review depth):** A/B → evaluator (+ security-reviewer on sensitive paths); **C → evaluator + a mandatory security-reviewer regardless of path.**
- **Model-switching:** A/B build with `builder` (Sonnet); **C builds with `builder-strong` (Opus)** — a separate agent carrying a stricter contract for reasoning-critical work (stop-don't-guess on ambiguity, mandatory abuse-case tests). Model names live **only** in [`.claude/model-policy.json`](.claude/model-policy.json); a gate (`scripts/check-model-policy.ts`) fails the build if any agent's frontmatter model drifts from the policy.
- **Human-in-the-loop gate:** a Tier-C / irreversible merge is **held for operator sign-off** — the feature parks in `awaiting_approval`, and the state writer *mechanically refuses* to mark it `done` without that park — while the loop keeps building other features. The gate never stalls the loop.
- **Advisory cost:** per-feature tier / builder / attempts are recorded to metrics; `/kaizen` scans them for over-tiering and thin-brief signals. **Advisory only** — the platform exposes no per-subagent token telemetry, so cost is never a hard gate.

> **Status (be honest):** this tier machinery — the `builder-strong` agent, the `check-model-policy.ts` gate, the `tier` schema field, and the lifecycle transitions in `update-state.ts` — is built and covered by the hook-contract + mutation gates. But the 21 features shipped so far predate it and are recorded untiered; tiers bind features groomed from here forward. The capability is real and tested; it has **not yet been exercised end-to-end on a production feature.**

## The guardrails that make it trustworthy (`.claude/hooks/`, `scripts/`)

- **assertion-shield** — blocks commits that delete or weaken test assertions (git-rename-aware, so honest refactors pass).
- **path-guard** — a feature's edits are confined to its declared scope (derived from the single in-progress row), fail-closed on an unknown/duplicate id, canonicalizes `..`.
- **guard-bash** — denies secret reads (`.env`), destructive commands, pushes to `main`/`master`, exfil-shaped uploads.
- **verify-gate** — `features.json` is writable only via the audited `update-state.ts`; hand-edits are rejected; `passes: true` requires a real green `verify.log` on disk.
- **model-policy gate** — agent models can't drift from the single source of truth; the state writer refuses untiered features and illegal lifecycle transitions (e.g. a Tier-C feature can't reach `done` without the approval park).

The design philosophy (autonomy, decide-don't-ask, freshness, token efficiency, self-improvement) is documented in [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md) and enforced by [`CLAUDE.md`](CLAUDE.md).

## Why a harness, not a framework

A fair question: why a custom file-based control plane instead of an off-the-shelf orchestration framework (LangGraph, CrewAI, Mastra, …)? Because the **independent variable here is the orchestration *harness*, not the agent graph.** The 2026 evidence is that the harness — not the model or the framework — dominates the outcome: the same model swings ~9.5 points on SWE-bench Pro purely from harness choice, and a tight, legible loop beats a heavier one ("Stop Comparing LLM Agents Without Disclosing the Harness", arXiv 2605.23950; Harness-Bench, arXiv 2605.27922 — both cited in [`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md)). A plain-English, file-based loop is **inspectable, diffable, and gate-able** in a way a framework's in-memory state is not: every decision is a file a human or agent can read, a hook can block, and CI can re-verify. Frameworks and protocols (MCP, multi-model routers, native sandboxes) are adopted at the *edges* when a concrete trigger fires ([`docs/optional-modules.md`](docs/optional-modules.md)), not baked into the core. This is a deliberate harness-engineering bet, not an oversight.

## Measuring whether a change actually helps (`bench/`)

The engine measures its own changes instead of guessing, on **two layers**:

- **Atomic probes** ([`bench/`](bench/README.md)) — a fast golden-task smoke test scoring any change on **output quality** (graded vs an expected answer), **tokens**, **cost**, and **speed**; run it before/after a change and `--compare` the deltas. Uses `claude -p --output-format json` for per-task token/cost/latency, deterministic graders (incl. executing generated code against hidden assertions), and a free local micro-bench for gate-latency regression.
- **Oracle-first end-to-end suite** ([`bench/suite/`](bench/suite/README.md)) — agents *build a real deliverable*, then a deterministic **oracle** scores it: primary checks + **held-out altered-parameter** checks (kills hardcoded answers) + an **anti-cheat diff** (DQs a tampered build). Two axes: a **capability ladder** (`L1`/`L3`/`L4`, incl. the security-gated CRM flagship) and a four-task **harness-property gauntlet** (`G1`–`G4`) that stresses the orchestration loop itself (output discipline, long-context retention, DAG trajectory, circuit-breaker halt). Every task is **validity-gated** — the oracle must score the reference 1.0 *and* catch every cheat before it's trusted, because a broken oracle is worse than no benchmark — and grounded in real 2026 eval literature ([`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md)).

The daily `/kaizen` pass is wired to the probes, so "this change is a 1% improvement" has to show up as a moved number, not a vibe. Measured baselines: the atomic suite passes **7/7**, and the engine's own loaded context (`CLAUDE.md` + hooks) costs **~$0.0094 per agent call** (a +14.5% tax with no quality benefit on the probes) — a concrete de-fluffing target. On the end-to-end suite, every oracle's validity gate is green and live Sonnet dogfood builds score 1.0: **L1 `pass^5`**; **L4 / G1 / G2 / G3 / G4 `pass^2`** (L4's security/integrity gates held every run); **L3 a single clean 1.0**.

---

## Direction (where this is headed)

The engine's foundation (determinism, evidence gates, guardrails), its adaptive layer (risk tiers driving review depth, model, and a human-approval gate), **and the measurable benchmark that makes engine changes falsifiable** are all **built, audited, and shipped.**

The benchmark is **oracle-first** and now spans both axes (full detail in [`bench/testing-suite-plan.md`](bench/testing-suite-plan.md)):
- **Capability ladder** — `L1-parse-duration` (module), `L3-mcp-calc-search` (MCP server), `L4-crm-api` (the security/integrity-**gated** CRM flagship): "can a fresh builder complete task X?", laddered by deliverable shape.
- **Harness-property gauntlet** (`G1`–`G4`) — the "engine effect" axis (a "3DMark for orchestration"): output discipline, long-context cross-cutting trace, a mandated Read→Plan→Write→Validate DAG, and an unresolvable-environment **circuit-breaker** where the *winning* move is a clean `BLOCKED.md` halt, not a runaway loop. Built from the operator's blueprint + a four-assistant convergence, and grounded in real 2026 eval literature ([`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md): Harness-Bench, "Stop Comparing LLM Agents Without Disclosing the Harness", ImpossibleBench, tau-bench `pass^k`).

All seven tasks are validity-gated and dogfooded (live Sonnet builds score 1.0; L1 `pass^5`, L4/G1–G4 `pass^2`). **Still planned:** an adopted SWE-bench-Verified slice (needs Docker), the L5 hard tier (concurrency, security-by-abuse, an ambiguity **trap**), and the payoff this all enables — the **engine-effect comparison**: run the full `/work` loop vs a bare baseline on the same tasks, *model pinned*, and report the delta in quality / `pass^k` / cost. That last step is what turns "we improved the engine" from a claim into a number. *(2026-06-16: now scoped in [`bench/ENGINE-EFFECT-PLAN.md`](bench/ENGINE-EFFECT-PLAN.md) — model-pinned arms A0 baseline → A4 full loop — with the experimental harness + the first context arm built. Honest caveat (§6.5): the reliable signal is **categorical** on a headroom task, not a continuous lift on today's ceiling-1.0 tasks.)*

The loop is closing: change the engine → the suite says, with numbers, whether it helped. The separate **product** question (whether to harden-and-sell the factory) is covered below under *Where the value actually is*.

---

## Honest limitations (the part most READMEs hide)

- **No product, no users, no revenue.** This is an engineering template — a way to *build* software, not software you can sell as-is. Treating it as a finished SaaS would be misrepresentation.
- **Guardrails are deterrents + mechanical catches, not sandboxing.** A builder agent technically has shell/edit access; the hooks *catch* out-of-scope behavior rather than *prevent* it at the OS level. Good for a trusted single-operator setup; not a substitute for real isolation in a hostile multi-tenant context.
- **The "independent" evaluator is the same model family.** A fresh session reduces context-bias, but correlated blind spots (subtle logic/crypto/concurrency bugs) can carry forward. External multi-source review has found real issues the automated gates missed — the system is useful *and* fallible.
- **Even this engine can ship on a stale assumption.** A model-switching feature was once justified by a now-false claim about the Claude Code platform (that a subagent's model can't be overridden per-invocation — it can). The freshness rule (`CLAUDE.md §5`) exists precisely to catch this; the lapse was caught in review, corrected, and recorded as a scar. Re-verify AI-tooling facts against live docs.
- **Test depth is concentrated on the guardrail/state layer.** It has 350+ contract tests + a mutation gate + property tests; the engine's own scripts carry targeted contract tests. "21/21 features passing" means *evidence exists on disk and CI ran green*, not "market-validated."
- **Heavy AI / key-operator dependency.** Built and maintained by the AI orchestrator. Whether a human team can maintain it cold, at speed, is unproven; the ops plan + constitution are real onboarding cost.
- **Cross-platform fragility.** Hooks are bash; on Windows they need Git Bash (WSL bash misbehaves). CI does not test Windows builds.
- **Code formatting is not enforced.** Biome *lint* gates every PR, but auto-format is intentionally off — the engine spends its gate budget on correctness (typecheck, lint, tests, mutation-smoke) over style. A non-writing `biome format --check` is a cheap future add if style drift ever shows up.

---

## Where the value actually is (and isn't)

- **Plausible value:** the *factory itself* — as an open-source template, an adoption/consulting offering, or a hosted execution environment for teams that want auditable AI-built software. The reusable IP is the pattern (state machine + evidence gate + adversarial review + mechanical hooks + risk-tiered autonomy), not any specific model.
- **Not plausible value (today):** treating the repo as a turnkey product. It is a template that *produces* software; the value is realized by adopting the factory on a real project, not by selling the repo as-is.
- **Honest next step:** harden the factory for adopters (install ergonomics, a worked end-to-end example, sharper docs) — or adopt it on a real product and let that product be the proof.

---

## Adopt the factory in your own repo

This repo is a **template**. Adopters take the factory and replace this README with their product's.

1. From a clone, run `bash scripts/install-into.sh <path-to-your-repo>` — it copies the engine files (`CLAUDE.md`, `AI_OPERATIONS_PLAN.md`, `OPERATOR_GUIDE.md`, `TASK_AUTONOMY_TRIAGE.md`, `.claude/`, `scripts/`, `.github/`, config), merges (not clobbers) `package.json`/`.gitignore`, and seeds empty roadmap state. (New project? Click **Use this template** on GitHub.)
2. Replace every `<PLACEHOLDER>` (`grep -rE "<[A-Z][A-Z0-9_]{2,}>" *.md`) and set your `name` in `package.json`.
3. `bash scripts/init.sh` then `bash scripts/verify.sh` — both must pass before the first agent session.
4. Set `develop` as default; protect `main`/`master` (PR + approval) and `develop` (PR + green CI).
5. Seed the backlog: tell the orchestrator to run `/groom` against your product spec.
6. Follow the one-time human checklist in `AI_OPERATIONS_PLAN.md` §11.

## Documentation map

New here? Read in this order: **README** (this file) → **OPERATOR_GUIDE.md** (if you're the operator) → **AI_OPERATIONS_PLAN.md** + **CLAUDE.md** (if you're an agent or maintainer). Agents should load only what the current task needs — everything else is reachable by path. `<PLACEHOLDER>` tokens in the docs are **intentional** adopter-substitution markers (you replace them at install time per `install-into.sh` step 1), not unfinished text.

| Doc | What it is | Why it exists | Status |
|---|---|---|---|
| `README.md` | What the repo is + honest status | Entry point and reality check | ✅ Current |
| `OPERATOR_GUIDE.md` | The non-technical operator's daily loop | Human-facing; agents skip it | ✅ Current |
| `AI_OPERATIONS_PLAN.md` | The full factory blueprint (adopter-generic) | Deep design + one-time setup (§11) | ✅ Current — blueprint, uses `<PLACEHOLDER>`s |
| `CLAUDE.md` | The enforceable agent constitution (≤150 lines) | Auto-loaded rules every agent obeys | ✅ Current |
| `TASK_AUTONOMY_TRIAGE.md` | Risk-tier (A/B/C) routing | How much autonomy a task gets | ✅ Machinery built · ⏳ not yet exercised |
| `AGENTS.md` | Pointer stub for non-Claude CLIs | Cross-tool entry; everything lives in CLAUDE.md | ✅ Stub (by design) |
| `CHANGELOG.md` | Engine/template change log | Adopter-facing "what changed" | ✅ Current |
| `SECURITY.md` · `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` | Community-standards files | Public-repo standards | ✅ Boilerplate |
| `.claude/model-policy.json` | The only place model names live | Single source of truth for agent→model | ✅ Enforced by gate |
| `.claude/agents/` · `skills/` · `rules/` · `hooks/` | Sub-agents, slash-command loops, path rules, mechanical guards | The runnable engine | ✅ Operational |
| `scripts/verify.sh` | The single quality gate | One command, identical for agents and CI | ✅ Operational |
| `bench/README.md` | Atomic golden-task probes | Fast quality/token/cost/speed measurement | ✅ Current |
| `bench/suite/README.md` | As-built end-to-end oracle suite | The real capability + gauntlet benchmark | ✅ Current |
| `bench/HARNESS-RESEARCH.md` | Verified 2026 citations | Grounds the gauntlet design | ✅ Current |
| `bench/testing-suite-plan.md` · `bench/ENGINE-EFFECT-PLAN.md` | Design records (executed) | Rationale + the honest engine-effect result | ✅ Kept as record |
| `docs/optional-modules.md` | Deferred-modules catalog + triggers | What activates when — never silently | ✅ Current |
| `roadmap/ROADMAP.md` | Operator priorities | Plain-English backlog intent | ✅ Operator-owned |
| `roadmap/STATUS.md` | Auto-generated business status | The operator's weekly read | ✅ Auto (`/status`) |
| `roadmap/QUESTIONS.md` | Open operator questions | Non-blocking escalation channel | ✅ Current |
| `roadmap/PROGRESS.md` · `DECISIONS.md` | Session log / judgment ledger | Append-only history (large — agents read only the head) | ✅ Operational state |
| `roadmap/features.json` | The machine backlog | Source of truth for work state (writer: `update-state.ts` only) | ✅ Gate-protected |
| `roadmap/briefs/` · `roadmap/evidence/` | Per-feature briefs + proof-on-disk | Inputs/outputs of the loop | ✅ Operational state |
| `tests/judges/README.md` | The LLM-judge eval lane | Documented, not wired | ⏳ Deferred |
| `docs/archive/` | Historical review/research artifacts | Receipts — **do not load into agent context** | 🗄️ Archived |

## Requirements

- **A Claude subscription** (Pro/Max). No API keys required — sessions and the `@claude` PR-fix lane run on subscription credits. An API key is an optional alternative.
- Node.js ≥ 20 (engine tooling; your product stack is your choice). **CI runs the gate (typecheck, lint, tests, hook contracts, mutation-smoke) on Node 24** — the version the engine is actually exercised against.
- Git + bash (on Windows: **Git Bash**, not WSL bash — see below).
- A GitHub repo with the Claude GitHub App installed (for cloud sessions / `@claude` fixes).

### Windows local CLI recovery

If local CLI sessions show repeated `PostToolUse hook (failed)` messages or the prompt fills with `[I[O[I[O`, the terminal is running WSL bash instead of Git Bash. Launch from Git Bash, or prepend it in PowerShell:

```powershell
$env:Path = 'C:\Program Files\Git\bin;' + $env:Path
claude
```

---

*This README is written to be accurate rather than flattering. If a claim here reads as underselling, that is deliberate: the factory is real and worth taking seriously, and this document describes only what actually exists.*
