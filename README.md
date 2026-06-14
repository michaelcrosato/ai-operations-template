# AI Operations Engine — what this actually is

> **Read this first, before the pitch deck.** This repository is **not a product**. It is a *control plane* for building software with frontier AI agents — a state machine, a set of mechanical guardrails, and an adversarial review loop that let AI write and ship code semi-autonomously while staying auditable. To prove the control plane works, the AI used it to build a demo app called **ForgeOps**. **ForgeOps is a non-functional mockup** — a polished front-end running on hardcoded data, with no backend, no real agents, and no real money moving. The asset here is the factory. The demo is just the factory's first output, and it is a demo, not a business.

If you only remember one sentence: **the engineering that's real is the "how we build" layer; the "ForgeOps product" is a UI shell.**

---

## The one-paragraph truth (for a skeptical investor)

A working harness lets Claude-based agents take a plain-English backlog item, build it on a branch, run a hard quality gate, get reviewed by a *separate* fresh-context AI judge (and a security reviewer for sensitive code), open a PR, and merge only on green CI — with mechanical hooks that block secret reads, destructive commands, pushes to protected branches, and silent deletion of test assertions. Over ~6 weeks it has shipped **33 features this way**, with every "done" backed by an evidence file on disk and CI green on the default branch. That loop is genuinely novel and it genuinely works. **What does not exist** is a sellable product, any users, any revenue, or any backend. The thing it built to demonstrate itself (ForgeOps — a "multi-agent orchestration SaaS") is entirely simulated in the browser. There is no AI agent execution, no LLM calls, no database, no billing. Anyone pitching "ForgeOps the SaaS" off the current code is selling a screenshot.

---

## What's real vs. what's a demo

| Claim | Reality |
|---|---|
| **The AI operations factory** (orchestrator + sub-agents + gates + hooks + state machine) | ✅ **Real and working.** ~7,300 lines of scripts/hooks/state + a detailed ops design. 33 features shipped through it; CI-green; mechanical guardrails actually block. This is the IP. |
| **Evidence-gated delivery** (nothing is "done" without proof on disk; `features.json` only writable by one audited script) | ✅ **Real, mechanically enforced.** Hand-editing state is blocked by a hook; faking a pass requires editing the hook itself. |
| **Adversarial review** (a fresh-context evaluator + a security reviewer grade each change before merge) | ✅ **Real, and it has caught real bugs** — including a privilege-escalation in the demo's permission code and a bypass hole in one of the guardrail fixes, both rejected before merge. |
| **"ForgeOps" — visually orchestrate multi-agent swarms** | ❌ **Mockup.** Canvas nodes are JSON objects. No agents are spawned, nothing executes. |
| **"Monitor every token and dollar in real time"** | ❌ **Simulated.** A browser timer mutates an in-memory object and appends fake log lines. No API, no token counting, no bill. |
| **"Simulation & A/B"** | ❌ **Deterministic arithmetic** on the graph shape (`costA = base × 1.22`, etc.). Not an execution model. |
| **"Export production-grade self-hosted agents"** | ❌ **Stub files.** The exporter writes a templated Dockerfile/compose with comments like *"in real export this would be the runnable code."* |
| **"Prompt → instant agent graph"** | ⚠️ **Keyword matcher.** ~50 lines: adds a "research" node if your prompt contains "research/search/find", a "summarize" node for "summar/report/output". Honest and deterministic — but not AI. |
| **Pricing / marketplace / billing** | ❌ **Cosmetic.** Buttons fire toasts. No Stripe, no accounts, no persistence (state is lost on refresh). |

---

## The real asset: the AI operations factory

This is what's worth your attention. It is a repeatable loop for AI-built software with guardrails that don't depend on the AI behaving well.

**The loop (one cycle):**
```
SELECT a backlog item → BRIEF (cheap explorer agents gather context)
→ BUILD (a builder agent, on a feat/ branch, scoped to authorized paths)
→ VERIFY (scripts/verify.sh: typecheck + lint + tests + state-validate + guards; evidence saved)
→ JUDGE (a fresh-context evaluator; + a security reviewer for auth/data/deps/CI/hooks)
→ SHIP (PR → develop, merge only on green CI)
→ RECORD (progress/decisions logs) → KAIZEN (one ≥1% system improvement) → LOOP
```

**The guardrails that make it trustworthy** (`.claude/hooks/`, `scripts/`):
- **assertion-shield** — blocks commits that delete or weaken test assertions (with git rename-awareness, so honest refactors pass).
- **path-guard** — a feature's edits are confined to its declared scope, derived from state, fail-closed.
- **guard-bash** — denies secret reads (`.env`), destructive commands, pushes to `main`/`master`, exfil-shaped uploads.
- **verify-gate** — `features.json` is writable only via the audited `update-state.ts`; hand-edits are rejected.
- **evidence contract** — `passes: true` requires a real green `verify.log` on disk; CI re-runs the real gate on every PR.

**What's been proven:** 33 features delivered through this loop; the adversarial review layer has rejected genuine regressions (privilege escalation, a guard-bypass, a tautological test) before they merged. The design philosophy (autonomy, decide-don't-ask, token efficiency, self-improvement) is documented in [`AI_OPERATIONS_PLAN.md`](AI_OPERATIONS_PLAN.md) and enforced by [`CLAUDE.md`](CLAUDE.md).

---

## Honest limitations (the part most READMEs hide)

- **No product, no users, no revenue.** ForgeOps is a self-test demo. There is no backend, database, auth, payment, or agent runtime. Selling it as a SaaS today would be misrepresentation.
- **The demo's marketing copy overstates it.** The landing page describes simulated UI as if it were live capability. It's labeled "illustrative," but a casual visitor could be misled. Treat it as an internal demo, not a sales asset.
- **Guardrails are deterrents + mechanical catches, not sandboxing.** A builder agent technically has shell/edit access; the hooks *catch* out-of-scope behavior rather than *prevent* it at the OS level. Good enough for a trusted single-operator setup; not a substitute for real isolation in a hostile multi-tenant context.
- **The "independent" evaluator is the same model family.** Running review in a fresh session reduces context-bias, but correlated blind spots (subtle logic/crypto/concurrency bugs) carry forward. An external 5-source review found real issues the automated gates missed — proof the system is useful *and* fallible.
- **Test depth is uneven.** The guardrail infrastructure has ~264 contract tests and the pure-function engine has ~50 unit tests — both solid. The 1,400-line demo UI has **one** happy-path browser test. "33/33 passing" means *evidence exists on disk and CI ran green*, not "33 market-validated features."
- **Heavy AI / key-operator dependency.** The repo is built and maintained by the AI orchestrator. Whether a human team can maintain it cold, at speed, is unproven. The ~58KB ops plan + ~9KB constitution are real onboarding cost.
- **Cross-platform fragility.** Hooks are bash; on Windows they need Git Bash (WSL bash misbehaves). CI does not test Windows builds.

---

## Where the value actually is (and isn't)

- **Plausible value:** the *factory itself* — as an open-source template, an adoption/consulting offering, or a hosted execution environment for teams that want auditable AI-built software. The reusable IP is the pattern (state machine + evidence gate + adversarial review + mechanical hooks), not any specific model.
- **Not plausible value (today):** "ForgeOps, the AI orchestration SaaS." That would require building everything the demo only pretends to do — agent runtime, persistence, billing, real LLM integration — i.e., the actual product, which does not exist.
- **Honest next step to a real product:** pick *one* of (a) harden and sell the factory, or (b) build ForgeOps for real (backend, agent execution, persistence, billing) and stop marketing the mockup until it ships.

---

## Adopt the factory in your own repo

This repo is a **template**. Adopters take the factory and replace this README with their product's.

1. From a clone, run `bash scripts/install-into.sh <path-to-your-repo>` — it copies the engine files (`CLAUDE.md`, `AI_OPERATIONS_PLAN.md`, `OPERATOR_GUIDE.md`, `.claude/`, `scripts/`, `.github/`, config), excludes this repo's own demo/state/evidence, merges (not clobbers) `package.json`/`.gitignore`, and seeds empty roadmap state. (New project? Click **Use this template** on GitHub.)
2. Replace every `<PLACEHOLDER>` (`grep -rE "<[A-Z][A-Z0-9_]{2,}>" *.md`) and set your `name` in `package.json`.
3. `bash scripts/init.sh` then `bash scripts/verify.sh` — both must pass before the first agent session.
4. Set `develop` as default; protect `main`/`master` (PR + approval) and `develop` (PR + green CI).
5. Seed the backlog: tell the orchestrator to run `/groom` against your product spec.
6. Follow the one-time human checklist in `AI_OPERATIONS_PLAN.md` §11.

## Requirements

- **A Claude subscription** (Pro/Max). No API keys required — sessions and the `@claude` PR-fix lane run on subscription credits. An API key is an optional alternative.
- Node.js ≥ 20 (engine tooling; your product stack is your choice). The demo runs on Next.js 16 / React 19.
- Git + bash (on Windows: **Git Bash**, not WSL bash — see below).
- A GitHub repo with the Claude GitHub App installed (for cloud sessions / `@claude` fixes).

### Windows local CLI recovery

If local CLI sessions show repeated `PostToolUse hook (failed)` messages or the prompt fills with `[I[O[I[O`, the terminal is running WSL bash instead of Git Bash. Launch from Git Bash, or prepend it in PowerShell:

```powershell
$env:Path = 'C:\Program Files\Git\bin;' + $env:Path
claude
```

---

*This README was rewritten to be accurate rather than flattering. If a claim here reads as underselling, that is deliberate: the factory is real and worth taking seriously precisely because the demo around it is honestly labeled as a demo.*
