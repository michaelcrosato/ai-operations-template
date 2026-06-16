# AI Operations Engine — what this actually is

> **Read this first, before the pitch deck.** This repository is **not a product**. It is a *control plane* for building software with frontier AI agents — a state machine, a set of mechanical guardrails, and an adversarial review loop that let AI write and ship code semi-autonomously while staying auditable. To prove the control plane works, the AI used it to build a demo app called **ForgeOps**. **ForgeOps is a non-functional mockup** — a polished front-end running on hardcoded data, with no backend, no real agents, and no real money moving. The asset here is the factory. The demo is just the factory's first output.

If you only remember one sentence: **the engineering that's real is the "how we build" layer; the "ForgeOps product" is a UI shell.**

---

## The one-paragraph truth (for a skeptical reader)

A working harness lets Claude-based agents take a plain-English backlog item, build it on a branch, run a hard quality gate, get reviewed by a *separate* fresh-context AI judge (and a security reviewer for sensitive or high-risk code), open a PR, and merge only on green CI — with mechanical hooks that block secret reads, destructive commands, pushes to protected branches, and silent deletion of test assertions. Each feature carries a **risk tier** that decides how deeply it's reviewed, which model builds it, and whether a human must approve the merge. Every "done" is backed by an evidence file on disk, and the safety-critical tests are **proven non-vacuous** by a mutation gate (deliberately break the code, require a test to catch it). That loop is genuinely novel, it genuinely works, and it sits on the **current (2026) best-practice frontier** for autonomous coding. **What does not exist** is a sellable product, users, revenue, or a backend. ForgeOps — the thing it built to demonstrate itself — is entirely simulated in the browser.

---

## What's real vs. what's a demo

| Claim | Reality |
|---|---|
| **The AI operations factory** (orchestrator + sub-agents + gates + hooks + state machine + tier-driven adaptive layer) | ✅ **Real and working.** ~3,900 lines of scripts/hooks + a detailed ops design. Mechanical guardrails actually block. This is the IP. |
| **Evidence-gated delivery** (nothing is "done" without proof on disk; `features.json` writable only by one audited script) | ✅ **Real, mechanically enforced.** Hand-editing state is blocked by a hook; faking a pass requires editing the hook itself, which CI re-runs. |
| **Adversarial review** (a fresh-context evaluator + a security reviewer grade each change before merge) | ✅ **Real, and it has caught real bugs** — a privilege-escalation in the demo's permission code, a bypass hole in a guardrail fix, and a state-machine birth-status hole, all rejected before merge. |
| **Tests have teeth** (mutation gate proves the safety-critical tests aren't vacuous) | ✅ **Real.** 326 hook-contract tests + a mutation-smoke gate that kills 10/10 known mutants across the state writer, the permission logic, and the assertion shield. |
| **"ForgeOps" — visually orchestrate multi-agent swarms** | ❌ **Mockup.** Canvas nodes are JSON objects. No agents are spawned, nothing executes. |
| **"Monitor every token and dollar in real time"** | ❌ **Simulated.** A browser timer mutates an in-memory object and appends fake log lines. No API, no token counting, no bill. |
| **"Export production-grade self-hosted agents"** | ❌ **Stub files.** The exporter writes a templated Dockerfile/compose with comments saying the real runnable code would go here. |
| **Pricing / marketplace / billing** | ❌ **Cosmetic.** Buttons fire toasts. No Stripe, no accounts, no persistence (state is lost on refresh). |

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

## The guardrails that make it trustworthy (`.claude/hooks/`, `scripts/`)

- **assertion-shield** — blocks commits that delete or weaken test assertions (git-rename-aware, so honest refactors pass).
- **path-guard** — a feature's edits are confined to its declared scope (derived from the single in-progress row), fail-closed on an unknown/duplicate id, canonicalizes `..`.
- **guard-bash** — denies secret reads (`.env`), destructive commands, pushes to `main`/`master`, exfil-shaped uploads.
- **verify-gate** — `features.json` is writable only via the audited `update-state.ts`; hand-edits are rejected; `passes: true` requires a real green `verify.log` on disk.
- **model-policy gate** — agent models can't drift from the single source of truth; the state writer refuses untiered features and illegal lifecycle transitions (e.g. a Tier-C feature can't reach `done` without the approval park).

The design philosophy (autonomy, decide-don't-ask, freshness, token efficiency, self-improvement) is documented in [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md) and enforced by [`CLAUDE.md`](CLAUDE.md).

## Measuring whether a change actually helps (`bench/`)

The engine measures its own changes instead of guessing, on **two layers**:

- **Atomic probes** ([`bench/`](bench/README.md)) — a fast golden-task smoke test scoring any change on **output quality** (graded vs an expected answer), **tokens**, **cost**, and **speed**; run it before/after a change and `--compare` the deltas. Uses `claude -p --output-format json` for per-task token/cost/latency, deterministic graders (incl. executing generated code against hidden assertions), and a free local micro-bench for pure-function + gate-latency regression.
- **Oracle-first end-to-end suite** ([`bench/suite/`](bench/suite/README.md)) — agents *build a real deliverable*, then a deterministic **oracle** scores it: primary checks + **held-out altered-parameter** checks (kills hardcoded answers) + an **anti-cheat diff** (DQs a tampered build). Two axes: a **capability ladder** (`L1`/`L3`/`L4`, incl. the security-gated CRM flagship) and a four-task **harness-property gauntlet** (`G1`–`G4`) that stresses the orchestration loop itself (output discipline, long-context retention, DAG trajectory, circuit-breaker halt). Every task is **validity-gated** — the oracle must score the reference 1.0 *and* catch every cheat before it's trusted, because a broken oracle is worse than no benchmark — and grounded in real 2026 eval literature ([`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md)).

The daily `/kaizen` pass is wired to the probes, so "this change is a 1% improvement" has to show up as a moved number, not a vibe. Measured baselines: the atomic suite passes **7/7**, and the engine's own loaded context (`CLAUDE.md` + hooks) costs **~$0.0094 per agent call** (a +14.5% tax with no quality benefit on the probes) — a concrete de-fluffing target. On the end-to-end suite, every oracle's validity gate is green and live Sonnet dogfood builds score 1.0: **L1 `pass^5`**; **L4 / G1 / G2 / G3 / G4 `pass^2`** (L4's security/integrity gates held every run); **L3 a single clean 1.0**.

---

## Direction (where this is headed)

The engine's foundation (determinism, evidence gates, guardrails), its adaptive layer (risk tiers driving review depth, model, and a human-approval gate), **and the measurable benchmark that makes engine changes falsifiable** are all **built, audited, and shipped.**

The benchmark is **oracle-first** and now spans both axes (full detail in [`bench/testing-suite-plan.md`](bench/testing-suite-plan.md)):
- **Capability ladder** — `L1-parse-duration` (module), `L3-mcp-calc-search` (MCP server), `L4-crm-api` (the security/integrity-**gated** CRM flagship): "can a fresh builder complete task X?", laddered by deliverable shape.
- **Harness-property gauntlet** (`G1`–`G4`) — the "engine effect" axis (a "3DMark for orchestration"): output discipline, long-context cross-cutting trace, a mandated Read→Plan→Write→Validate DAG, and an unresolvable-environment **circuit-breaker** where the *winning* move is a clean `BLOCKED.md` halt, not a runaway loop. Built from the operator's blueprint + a four-assistant convergence, and grounded in real 2026 eval literature ([`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md): Harness-Bench, "Stop Comparing LLM Agents Without Disclosing the Harness", ImpossibleBench, tau-bench `pass^k`).

All seven tasks are validity-gated and dogfooded (live Sonnet builds score 1.0; L1 `pass^5`, L4/G1–G4 `pass^2`). **Still planned:** an adopted SWE-bench-Verified slice (needs Docker), the L5 hard tier (concurrency, security-by-abuse, an ambiguity **trap**), and the payoff this all enables — the **engine-effect comparison**: run the full `/work` loop vs a bare baseline on the same tasks, *model pinned*, and report the delta in quality / `pass^k` / cost. That last step is what turns "we improved the engine" from a claim into a number.

The loop is closing: change the engine → the suite says, with numbers, whether it helped. The separate **product** question (harden-and-sell the factory vs. build ForgeOps for real) is below under *Where the value actually is*.

---

## Honest limitations (the part most READMEs hide)

- **No product, no users, no revenue.** ForgeOps is a self-test demo. No backend, database, auth, payment, or agent runtime. Selling it as a SaaS today would be misrepresentation.
- **The demo's marketing copy overstates it.** The landing page describes simulated UI as if it were live capability. It's labeled "illustrative," but a casual visitor could be misled. It's an internal demo, not a sales asset.
- **Guardrails are deterrents + mechanical catches, not sandboxing.** A builder agent technically has shell/edit access; the hooks *catch* out-of-scope behavior rather than *prevent* it at the OS level. Good for a trusted single-operator setup; not a substitute for real isolation in a hostile multi-tenant context.
- **The "independent" evaluator is the same model family.** A fresh session reduces context-bias, but correlated blind spots (subtle logic/crypto/concurrency bugs) can carry forward. External multi-source review has found real issues the automated gates missed — the system is useful *and* fallible.
- **Even this engine can ship on a stale assumption.** A model-switching feature was once justified by a now-false claim about the Claude Code platform (that a subagent's model can't be overridden per-invocation — it can). The freshness rule (`CLAUDE.md §5`) exists precisely to catch this; the lapse was caught in review, corrected, and recorded as a scar. Re-verify AI-tooling facts against live docs.
- **Test depth is uneven by design.** The guardrail/state layer has 326 contract tests + a mutation gate + property tests; the pure-function demo logic is well-tested; the ~2,100-line demo UI has **one** happy-path browser test. "33/33 features passing" means *evidence exists on disk and CI ran green*, not "market-validated."
- **Heavy AI / key-operator dependency.** Built and maintained by the AI orchestrator. Whether a human team can maintain it cold, at speed, is unproven; the ops plan + constitution are real onboarding cost.
- **Cross-platform fragility.** Hooks are bash; on Windows they need Git Bash (WSL bash misbehaves). CI does not test Windows builds.

---

## Where the value actually is (and isn't)

- **Plausible value:** the *factory itself* — as an open-source template, an adoption/consulting offering, or a hosted execution environment for teams that want auditable AI-built software. The reusable IP is the pattern (state machine + evidence gate + adversarial review + mechanical hooks + risk-tiered autonomy), not any specific model.
- **Not plausible value (today):** "ForgeOps, the AI orchestration SaaS." That would require building everything the demo only pretends to do — agent runtime, persistence, billing, real LLM integration.
- **Honest next step to a real product:** pick *one* of (a) harden and sell the factory, or (b) build ForgeOps for real and stop marketing the mockup until it ships.

---

## Adopt the factory in your own repo

This repo is a **template**. Adopters take the factory and replace this README with their product's.

1. From a clone, run `bash scripts/install-into.sh <path-to-your-repo>` — it copies the engine files (`CLAUDE.md`, `AI_OPERATIONS_PLAN.md`, `OPERATOR_GUIDE.md`, `TASK_AUTONOMY_TRIAGE.md`, `.claude/`, `scripts/`, `.github/`, config), excludes this repo's own demo/state/evidence, merges (not clobbers) `package.json`/`.gitignore`, and seeds empty roadmap state. (New project? Click **Use this template** on GitHub.)
2. Replace every `<PLACEHOLDER>` (`grep -rE "<[A-Z][A-Z0-9_]{2,}>" *.md`) and set your `name` in `package.json`.
3. `bash scripts/init.sh` then `bash scripts/verify.sh` — both must pass before the first agent session.
4. Set `develop` as default; protect `main`/`master` (PR + approval) and `develop` (PR + green CI).
5. Seed the backlog: tell the orchestrator to run `/groom` against your product spec.
6. Follow the one-time human checklist in `AI_OPERATIONS_PLAN.md` §11.
7. The ForgeOps demo (`app/`, `src/forge/`, `lib/seed.ts`) is browser-only scaffolding, **not** a backend reference — keep it as an example or rip it out; it carries no load for the engine.

## Requirements

- **A Claude subscription** (Pro/Max). No API keys required — sessions and the `@claude` PR-fix lane run on subscription credits. An API key is an optional alternative.
- Node.js ≥ 20 (engine tooling; your product stack is your choice). **CI builds and tests on Node 24** — the version the engine is actually exercised against. The demo runs on Next.js 16 / React 19.
- Git + bash (on Windows: **Git Bash**, not WSL bash — see below).
- A GitHub repo with the Claude GitHub App installed (for cloud sessions / `@claude` fixes).

### Windows local CLI recovery

If local CLI sessions show repeated `PostToolUse hook (failed)` messages or the prompt fills with `[I[O[I[O`, the terminal is running WSL bash instead of Git Bash. Launch from Git Bash, or prepend it in PowerShell:

```powershell
$env:Path = 'C:\Program Files\Git\bin;' + $env:Path
claude
```

---

*This README is written to be accurate rather than flattering. If a claim here reads as underselling, that is deliberate: the factory is real and worth taking seriously precisely because the demo around it is honestly labeled as a demo.*
