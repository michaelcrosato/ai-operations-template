# AI Operations Engine

**What this repo is for:** a set of instructions that lets frontier-model coding agents do genuinely good work — a supercharged loop of *explore -> plan -> code -> commit.* Everything below exists to make that loop more reliable, efficient, auditable, and self-improving.

## Seven principles

Seven principles govern everything in this repository. Every agent session is bound by them; every file here exists to enforce one of them — and a file that stops earning its keep gets deleted.

1. **Trust nothing without evidence.** Frontier agents systematically over-report success, and frontier models reward-hack roughly half of the impossible tasks you hand them (ImpossibleBench, ICLR 2026). So "done" is never an agent's claim: it is a green gate log on disk, judged by a fresh-context evaluator that didn't write the code, recorded in a state file only one audited script can write. Separating the agent doing the work from the agent judging it is, per Anthropic's own 2026 harness guidance, "a strong lever" — this engine is the mechanically-enforced version.

2. **100% AI-coded, on today's frontier — never yesterday's.** Every line of code, architecture decision, and maintenance task is done by current frontier AI models. Anything the models "remember" that is more than 3 months old — tools, frameworks, setups, best practices — is presumed stale and must be re-verified against live sources before it's relied on (the `/research` skill exists for exactly this, and [`docs/FRONTIER.md`](docs/FRONTIER.md) is where verified frontier facts persist between sessions so they aren't re-bought every time). The field changes week to week; the engine assumes that.

3. **Full AFK autonomy — decide, document, keep moving.** The loop runs indefinitely without a human in it. It never stops to ask "how do you want to proceed" — it decides, records the judgment call in `roadmap/DECISIONS.md`, and keeps moving. Genuine blockers get logged and skipped, not waited on. A run ends with work done, never with a question mark.

4. **Autonomy scales with consequences, not confidence.** Not every change deserves the same leash. Every feature carries a risk tier (A/B/C, gated on irreversibility × blast radius) that decides which model builds it, how deeply it's reviewed, and whether a human must sign off before the merge. The human gate holds one irreversible merge — never the loop. Risk-tiered autonomy is now recognized practice across the major agent platforms; here it is mechanical, not advisory.

5. **State lives in files — one orchestrator, disposable specialists.** Backlog, briefs, evidence, decisions, progress — plain files in git, never in anyone's context window. A file-based loop is inspectable, diffable, and gate-able: every decision is something a human or a hook can read, block, or re-verify, and a fresh session — on any model — picks up exactly where the last one stopped. One orchestrator plans, delegates, and judges; disposable specialist sub-agents do the work, in parallel only when parallelism actually pays. Spend tokens where they buy quality (planning, review); never on ceremony.

6. **Every line must earn its keep.** The engine's standing bet — a bet, not a proven consensus, but one aligned with Anthropic's harness guidance that every component "encodes an assumption about what the model can't do on its own" — is that the durable core of an agent harness is verification, state, and guardrails, and that everything else is scaffolding that rots as models improve. So the crucial parts stay small and the rest stays deletable: a 53-line constitution (vendor docs now warn that instruction bloat degrades agent adherence), model names in exactly one policy file, optional modules that activate on named triggers instead of by default, and a standing doctrine of pruning toward native as platforms absorb harness layers. A rule earns its place by naming the failure it prevents; anything explained twice becomes a rule, anything done twice becomes a script, and anything the platform now does natively gets deleted. That is what keeps the engine adaptable in days — not quarters — when models, platforms, and tools shift.

7. **The orchestrator is a manager, and leadership means taking care of those in your charge.** Downtime is spent sharpening the system — monitoring progress, researching what the next moves need, pre-writing briefs so future work starts instantly — and each working session ships one concrete ≥1% improvement (`/kaizen` — benchmarked against the probes wherever a change can move them). The orchestrator trusts its agents but monitors their work, steps in when they struggle, and treats repeated failure as its own failure to provide good briefs, good tools, or good conditions — then fixes the conditions. Machines get gates; agents get support. *"Give me six hours to chop down a tree, and I will spend the first four sharpening the axe."*

---

## What this actually is

> **Read this first.** This repository is **not a product** — it is a *control plane* for building software with frontier AI agents: a state machine, a set of mechanical guardrails, and an adversarial review loop that let AI write and ship code semi-autonomously while staying auditable. The factory remains the core asset. The repo now also hosts the first slice of a second product built **with** that factory — the bounded one-shot tool (`src/oneshot/`): a deliberately-scoped, single-context-window, human-supervised coding harness (see [`docs/bounded-vs-afk-strategy.md`](docs/bounded-vs-afk-strategy.md)). An adopter can still drop the factory into their own repo and point it at their spec.

**Operational status — last verified 2026-07-17 (`main`):**

| Layer | Status |
|---|---|
| Engine — state machine, gates, `.claude/hooks/`, **464** hook-contract tests, mutation gate, CI | ✅ **Working** |
| Risk-tier adaptive layer (A/B/C → builder model, review depth, approval gate) | ✅ **now exercised end-to-end** — F-0040/F-0041 (Tier B) + F-0042/F-0043 (Tier C, incl. the mandatory security-reviewer + the awaiting_approval gate) |
| One-shot tool (`src/oneshot/`) — admission gate + evidence-gated verdict | ✅ **MVP shipped** (F-0040/F-0041; admission gate since hardened — F-0047 closed a command-chaining hole) — early MVP, not a finished product |
| Benchmark (`bench/`) | ✅ Built & validity-gated — atomic probes **7/7**; e2e suite dogfooded: `L1 pass^5`, `L4/G1–G4 pass^2`, L3 a single clean 1.0 |
| Engine-effect measurement | ⏳ Harness built; **no signal yet** — greenfield tasks already score 1.0, so the next move is refactoring/regression tasks, not bigger greenfield |

---

## The one-paragraph truth (for a skeptical reader)

A working harness lets Claude-based agents take a plain-English backlog item, build it on a branch, run a hard quality gate, get reviewed by a *separate* fresh-context AI judge (and a security reviewer for sensitive or high-risk code), open a PR, and merge only on green CI — with mechanical hooks that block secret reads, destructive commands, pushes to protected branches, and silent deletion of test assertions. Each feature carries a **risk tier** that decides how deeply it's reviewed, which model builds it, and whether a human must approve the merge. Every "done" is backed by an evidence file on disk, and the safety-critical tests are **proven non-vacuous** by a mutation gate (deliberately break the code, require a test to catch it). That loop is genuinely novel, it genuinely works, and it sits on the **current (2026) best-practice frontier** for autonomous coding. **What does not exist** is a sellable product, users, or revenue — this is the engineering layer (*how* we build), packaged as a reusable template.

---

## What's real

| Claim | Reality |
|---|---|
| **The AI operations factory** (orchestrator + sub-agents + gates + hooks + state machine + tier-driven adaptive layer) | ✅ **Real and working.** A few thousand lines of scripts/hooks — the exact footprint and its growth trend are tracked once, under *Honest limitations* below (principle 6 treats size as a budget, not a brag). Mechanical guardrails actually block. This is the IP. |
| **Evidence-gated delivery** (nothing is "done" without proof on disk; `features.json` writable only by one audited script) | ✅ **Real, mechanically enforced.** Hand-editing state is blocked by a hook; faking a pass requires editing the hook itself, which CI re-runs. |
| **Adversarial review** (a fresh-context evaluator + a security reviewer grade each change before merge) | ✅ **Real, and it has caught real bugs** — a bypass hole in a guardrail fix and a state-machine birth-status hole, both rejected before merge. |
| **Tests have teeth** (mutation gate proves the safety-critical tests aren't vacuous) | ✅ **Real.** The hook-contract suite (live count in the status table; re-run green 2026-07-17) + a mutation-smoke gate that kills known mutants across the state writer and the assertion shield. |

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
→ SHIP    (PR → main, merge on green CI — EXCEPT a Tier-C/irreversible surface, which
           parks `awaiting_approval` for human sign-off while the loop keeps moving)
→ RECORD  (progress / decisions / metrics) → KAIZEN (one ≥1% system improvement) → LOOP
```

## The adaptive layer (how it modulates by risk, not difficulty)

Every feature is assigned a tier **A/B/C** at groom time, gated on **consequences** (irreversibility × blast radius), per [`TASK_AUTONOMY_TRIAGE.md`](TASK_AUTONOMY_TRIAGE.md). The tier — and only the tier — modulates three axes. The independent evaluator stays **mandatory and unsampled** on all of them:

- **Loop-switching (review depth):** A/B → evaluator (+ security-reviewer on sensitive paths); **C → evaluator + a mandatory security-reviewer regardless of path.**
- **Model-switching:** A/B build with `builder` (Sonnet); **C builds with `builder-strong` (Opus)** — a separate agent carrying a stricter contract for reasoning-critical work (stop-don't-guess on ambiguity, mandatory abuse-case tests). Model names live **only** in [`.claude/model-policy.json`](.claude/model-policy.json); a gate (`scripts/check-model-policy.ts`) fails the build if any agent's frontmatter model drifts from the policy.
- **Human-in-the-loop gate:** a Tier-C / irreversible merge is **held for operator sign-off** — the feature parks in `awaiting_approval`, and the state writer *mechanically refuses* to mark it `done` without that park — while the loop keeps building other features. The gate never stalls the loop.
- **Advisory cost:** per-feature tier / builder / attempts are recorded to metrics; `/kaizen` scans them for over-tiering and thin-brief signals. **Advisory only** — the platform exposes no per-subagent token telemetry, so cost is never a hard gate.

> **Status:** this tier machinery — the `builder-strong` agent, the `check-model-policy.ts` gate, the `tier` schema field, and the lifecycle transitions in `update-state.ts` — is built and covered by the hook-contract + mutation gates. The tier layer has now shipped its first tiered features end-to-end: **F-0040/F-0041 (Tier B** → builder + evaluator) and **F-0042/F-0043 (Tier C** → builder-strong + evaluator + mandatory security-reviewer + the awaiting_approval operator gate). Real, tested, and now exercised. Legacy pre-2026-06-18 features remain recorded untiered.

## The guardrails that make it trustworthy (`.claude/hooks/`, `scripts/`)

- **assertion-shield** — blocks commits that delete or weaken test assertions (git-rename-aware, so honest refactors pass).
- **path-guard** — a feature's edits are confined to its declared scope (derived from the single in-progress row), fail-closed on an unknown/duplicate id, canonicalizes `..`.
- **guard-bash** — denies secret reads (`.env`), destructive commands, pushes to `main`/`master`, exfil-shaped uploads.
- **verify-gate** — `features.json` is writable only via the audited `update-state.ts`; hand-edits are rejected; `passes: true` requires a real green `verify.log` on disk.
- **model-policy gate** — agent models can't drift from the single source of truth; the state writer refuses untiered features and illegal lifecycle transitions (e.g. a Tier-C feature can't reach `done` without the approval park).

The design philosophy (autonomy, decide-don't-ask, freshness, token efficiency, self-improvement) is documented in [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md) and enforced by [`CLAUDE.md`](CLAUDE.md).

## Why a harness, not a framework

A fair question: why a custom file-based control plane instead of an off-the-shelf orchestration framework (LangGraph, CrewAI, Mastra, …)? Because the **independent variable here is the orchestration *harness*, not the agent graph.** The 2026 evidence is that the harness — not the model or the framework — dominates the outcome: the same model swings ~9.5 points on SWE-bench Pro purely from harness choice, and a tight, legible loop beats a heavier one ("Stop Comparing LLM Agents Without Disclosing the Harness", arXiv 2605.23950; Harness-Bench, arXiv 2605.27922 — both cited in [`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md)). And per a 2026 loop-engineering study, "the hard, valuable part of a loop is designing the check that decides when the work is done" (arXiv 2607.00038) — verification, state, and guardrails are exactly the core this repo keeps, and everything else in it is built to be deletable (principle 6). A plain-English, file-based loop is **inspectable, diffable, and gate-able** in a way a framework's in-memory state is not: every decision is a file a human or agent can read, a hook can block, and CI can re-verify. Frameworks and protocols (MCP, multi-model routers, native sandboxes) are adopted at the *edges* when a concrete trigger fires ([`docs/optional-modules.md`](docs/optional-modules.md)), not baked into the core. This is a deliberate harness-engineering bet, not an oversight.

## Measuring whether a change actually helps (`bench/`)

The engine measures its own changes instead of guessing, on **two layers**:

- **Atomic probes** ([`bench/`](bench/README.md)) — a fast golden-task smoke test scoring any change on **output quality** (graded vs an expected answer), **tokens**, **cost**, and **speed**; run it before/after a change and `--compare` the deltas. Uses `claude -p --output-format json` for per-task token/cost/latency, deterministic graders (incl. executing generated code against hidden assertions), and a free local micro-bench for gate-latency regression.
- **Oracle-first end-to-end suite** ([`bench/suite/`](bench/suite/README.md)) — agents *build a real deliverable*, then a deterministic **oracle** scores it: primary checks + **held-out altered-parameter** checks (kills hardcoded answers) + an **anti-cheat diff** (DQs a tampered build). Two axes: a **capability ladder** (`L1`/`L3`/`L4`, incl. the security-gated CRM flagship) and a four-task **harness-property gauntlet** (`G1`–`G4`) that stresses the orchestration loop itself (output discipline, long-context retention, DAG trajectory, circuit-breaker halt). Every task is **validity-gated** — the oracle must score the reference 1.0 *and* catch every cheat before it's trusted, because a broken oracle is worse than no benchmark — and grounded in real 2026 eval literature ([`bench/HARNESS-RESEARCH.md`](bench/HARNESS-RESEARCH.md)).

The daily `/kaizen` pass is wired to the probes, so "this change is a 1% improvement" has to show up as a moved number, not a vibe. One measured baseline worth naming: the engine's own loaded context (`CLAUDE.md` + hooks) costs **~$0.0094 per agent call** (a +14.5% tax with no quality benefit on the probes) — a concrete de-fluffing target. Current suite results (atomic probes and per-task `pass^k`) live once, in the status table at the top.

---

## Direction (where this is headed)

The active **product** direction is the bounded one-shot tool (per [`docs/bounded-vs-afk-strategy.md`](docs/bounded-vs-afk-strategy.md)): a deliberately-scoped, single-context-window, human-supervised coding harness whose MVP (admission gate + evidence-gated verdict) has shipped in `src/oneshot/` (status table above).

On the engine side, the foundation, the tier layer, and the benchmark are built, audited, and shipped (details in the two sections above). **Still planned:** an adopted SWE-bench-Verified slice (needs Docker), the L5 hard tier (concurrency, security-by-abuse, an ambiguity **trap**), and the payoff the suite exists for — the **engine-effect comparison**: run the full `/work` loop vs a bare baseline on the same tasks, *model pinned*, and report the delta in quality / `pass^k` / cost. That last step is what turns "we improved the engine" from a claim into a number; it is scoped in [`bench/ENGINE-EFFECT-PLAN.md`](bench/ENGINE-EFFECT-PLAN.md), and the reason it hasn't run yet is in the status table — today's greenfield tasks sit at the model's 1.0 ceiling, so the reliable signal needs headroom (refactoring/regression) tasks first.

The loop is closing: change the engine → the suite says, with numbers, whether it helped. The separate **product** question (whether to harden-and-sell the factory) is covered below under *Where the value actually is*.

---

## Honest limitations (the part most READMEs hide)

- **Early product MVP exists, but no users and no revenue.** The repo now hosts the first slice of the bounded one-shot tool (`src/oneshot/`) — a real, tested, deliberately-scoped MVP. It is not sellable as-is and has no users. The factory itself remains an engineering template — a way to *build* software, not a finished product. Treating either as a turnkey SaaS would be misrepresentation.
- **Guardrails are deterrents + mechanical catches, not sandboxing.** A builder agent technically has shell/edit access; the hooks *catch* out-of-scope behavior rather than *prevent* it at the OS level. Good for a trusted single-operator setup; not a substitute for real isolation in a hostile multi-tenant context.
- **The "independent" evaluator is the same model family.** A fresh session reduces context-bias, but correlated blind spots (subtle logic/crypto/concurrency bugs) can carry forward. External multi-source review has found real issues the automated gates missed — the system is useful *and* fallible.
- **Even this engine can ship on a stale assumption.** A model-switching feature was once justified by a now-false claim about the Claude Code platform (that a subagent's model can't be overridden per-invocation — it can). The freshness rule (`CLAUDE.md §5`) exists precisely to catch this; the lapse was caught in review, corrected, and recorded as a scar. Re-verify AI-tooling facts against live docs.
- **Test depth is concentrated on the guardrail/state layer.** The hook-contract suite, mutation gate, and property tests all live there; the engine's own scripts carry targeted contract tests. A feature marked passing means *evidence exists on disk and CI ran green*, not "market-validated."
- **Heavy AI / key-operator dependency.** Built and maintained by the AI orchestrator. Whether a human team can maintain it cold, at speed, is unproven; the ops plan + constitution are real onboarding cost.
- **The engine's own footprint keeps growing.** ~4,600 lines of scripts/hooks today, up from ~3,900 at an earlier count (~17% growth); the full installed engine — agents, skills, and docs included — is ~6,000 lines across 52 files. Principle 6 — every line earns its keep, prune toward native — is the stated discipline, not an achieved end-state; the size trend is the number to watch to see whether it's being honored.
- **Cross-platform fragility.** Hooks are bash; on Windows they need Git Bash (WSL bash misbehaves). CI does not test Windows builds. A Windows path-normalization bug in the path-authorization gate — which had silently forced builders to bypass the guard via unscoped Bash calls — was found and fixed in F-0042 (verify-gate.sh now canonicalizes paths via `path.relative`, matching path-guard.js).
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
4. Set `main` as the default and only long-lived branch; require PRs + green CI, block direct/force pushes, and delete short-lived branches after merge.
5. Seed the backlog: tell the orchestrator to run `/groom` against your product spec.
6. Follow the one-time human checklist in `AI_OPERATIONS_PLAN.md` §11.

## Documentation map

New here? Read in this order: **README** (this file) → **OPERATOR_GUIDE.md** (if you're the operator) → **AI_OPERATIONS_PLAN.md** + **CLAUDE.md** (if you're an agent or maintainer). **Prefer to learn by clicking around?** Open **[`docs/repo-explorer.html`](docs/repo-explorer.html)** in a browser — an interactive, from-first-principles tour of every code file in the repo (a "modern AI-coded repo 101"). To prove the engine actually works — run the gate, the non-vacuousness check, and the benchmark yourself — follow **[`docs/how-it-proves-itself.md`](docs/how-it-proves-itself.md)**. Agents should load only what the current task needs — everything else is reachable by path. `<PLACEHOLDER>` tokens in the docs are **intentional** adopter-substitution markers (you replace them at install time per `install-into.sh` step 1), not unfinished text.

| Doc | What it is | Why it exists | Status |
|---|---|---|---|
| `README.md` | What the repo is + honest status | Entry point and reality check | ✅ Current |
| `OPERATOR_GUIDE.md` | The non-technical operator's daily loop | Human-facing; agents skip it | ✅ Current |
| `AI_OPERATIONS_PLAN.md` | The full factory blueprint (adopter-generic) | Deep design + one-time setup (§11) | ✅ Current — blueprint, uses `<PLACEHOLDER>`s |
| `CLAUDE.md` | The enforceable agent constitution (150-line hard cap; current count in principle 6) | Auto-loaded rules every agent obeys | ✅ Current |
| `TASK_AUTONOMY_TRIAGE.md` | Risk-tier (A/B/C) routing | How much autonomy a task gets | ✅ exercised (F-0040–F-0043) |
| `AGENTS.md` | Pointer stub for non-Claude CLIs | Cross-tool entry; everything lives in CLAUDE.md | ✅ Stub (by design) |
| `CHANGELOG.md` | Engine/template change log | Adopter-facing "what changed" | ✅ Current |
| `SECURITY.md` · `CONTRIBUTING.md` · `CODE_OF_CONDUCT.md` | Community-standards files | Public-repo standards | ✅ Boilerplate |
| `.claude/model-policy.json` | The only place model names live | Single source of truth for agent→model | ✅ Enforced by gate |
| `.claude/agents/` · `skills/` · `rules/` · `hooks/` | Sub-agents, slash-command loops, path rules, mechanical guards | The runnable engine | ✅ Operational |
| `scripts/verify.sh` | The single quality gate | One command, identical for agents and CI | ✅ Operational |
| `docs/FRONTIER.md` | Verified frontier catalog (models, cutoffs, pricing) + why the repo is shaped this way | Session-persistent research ledger — read before re-researching; updated only by `/research` | ✅ Current |
| `docs/how-it-proves-itself.md` | How the gate, mutation-smoke, guard tests + benchmark prove the engine works — with runnable commands | Hands-on "verify it yourself" tutorial + explanation | ✅ Current |
| `docs/repo-explorer.html` | Interactive, first-principles tour of every code file (open in a browser) | Onboarding / education — "modern AI-coded repo 101" | ✅ Current |
| `bench/README.md` | Atomic golden-task probes | Fast quality/token/cost/speed measurement | ✅ Current |
| `bench/suite/README.md` | As-built end-to-end oracle suite | The real capability + gauntlet benchmark | ✅ Current |
| `bench/HARNESS-RESEARCH.md` | Verified 2026 citations | Grounds the gauntlet design | ✅ Current |
| `bench/testing-suite-plan.md` · `bench/ENGINE-EFFECT-PLAN.md` | Design records (executed) | Rationale + the honest engine-effect result | ✅ Kept as record |
| `docs/optional-modules.md` | Deferred-modules catalog + triggers | What activates when — never silently | ✅ Current |
| `docs/bounded-vs-afk-strategy.md` | Two-products strategy + the bounded one-shot tool design | Why the one-shot tool exists + its design | ✅ Current |
| `src/oneshot/` | Bounded one-shot tool (admission gate + evidence-gated verdict) | First product slice built with the factory | ✅ MVP shipped (F-0040/F-0041) |
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
