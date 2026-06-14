# Implementation Plan — Autonomous AI-Coding Factory (verified mid-June 2026)

> **What this is.** A detailed, build-ready plan for a system where frontier AI agents do *all* the coding, architecture, and maintenance; run unattended (AFK) for hours or days; are operated by a non-technical business client; and continuously improve themselves — under a simple, token-efficient, orchestrator-style design with hard, auditable guardrails.
>
> **Grounding & freshness.** Every tooling/model claim below was verified against live sources in **June 2026** (not training memory). The single most important verified finding: **the agent *harness* now matters more than the base model** — wrapper/orchestration quality is ~60% of real-world agentic-coding outcome; base-model choice is ~40%. The second: **autonomous coding agents have caused 188 confirmed direct-harm incidents** (Sept 2023–May 2026), including a Claude Code session deleting a `C:` drive and the PocketOS agent deleting a database *and its backups* in 9 seconds. **Therefore guardrails and isolation are not optional polish — they are the core of the build.** A working reference implementation of much of this already exists in this repository (it shipped 33 features through the loop below); this plan re-grounds it in current tooling and hardens the safety layer.
>
> **Re-verify on a cadence.** Treat anything here older than ~1 month as stale (June 2026 alone saw Claude Fable 5, Microsoft MAI-Code, MiniMax M3, and GPT-5.6 rumors). The plan includes a standing `/research` re-verification step for exactly this.

---

## 1. The six requirements → mechanism map

| Requirement | How this plan satisfies it (mechanism) |
|---|---|
| **100% AI-coded on current frontier** | Capability *tiers*, never hardcoded model names; a single `model-policy.json`; a mandatory `/research` re-verify step before relying on any model/tool/framework fact >1 month old. |
| **Full AFK autonomy** | Cloud **Routines** (scheduled/API/GitHub-triggered, run promptless) as the unattended engine; **Auto Mode** classifier delegates approvals; decide-don't-ask policy; blockers are logged-and-skipped, never waited on; hard `--max-turns`/budget caps. |
| **Non-technical operator** | **Claude Cowork** (GUI, "Claude Code without the terminal") + plain-English outcome goals; **risk-tiered approval** (no confirmation fatigue); narrative status reports, not dashboards; QA = clicking through finished work; budget alerts at 80%/100%. |
| **Simple, token-efficient, orchestrator-style** | One orchestrator + disposable subagents; **fork-mode** spawning (20–40% cheaper via prompt-cache reuse); parallelism only for independent 2-min+ tasks; file-based state (not context); **context compaction** at 150k tokens. |
| **Self-improving / self-fixing** | Daily `/kaizen` (one ≥1% system improvement); downtime **ProAct** protocol (anticipatory research, pre-briefing, problem detection); **Dreaming** (background pattern extraction across past sessions); skill-patching from eval failures. |
| **Daily human + long autonomous stretches** | Human does ~20 min/day (plan in plain English, approve Tier-4 gates, click-through QA); the loop runs autonomously between touchpoints on a clear backlog. |

---

## 2. Platform & model stack (verified June 2026)

### 2.1 Models — choose *tiers*, never names
Hardcoding a model name guarantees staleness (the field moves weekly). Define capability tiers in one file (`.claude/model-policy.json`) and reference tiers everywhere.

| Tier | Use | Current best pick (June 2026) | Notes |
|---|---|---|---|
| **Heavy / hard coding & judging** | builders on complex features, security review, final synthesis | **Claude Opus 4.8** (`claude-opus-4-8`, 1M ctx, $5/$25) as default; **Claude Fable 5** (`claude-fable-5`, 1M ctx, $10/$50) for the hardest SWE tasks | Fable 5 leads *vendor* SWE-Bench (80.3%) but that's on Anthropic's own scaffold; independent SEAL scores are far lower. Opus 4.8 is the cost/quality sweet spot and battle-tested. |
| **Fast / routine** | explorers, classification, docs, status copy | **Claude Sonnet 4.6** ($3/$15); **Haiku 4.5** ($1/$5) for trivial/batch | Fan out cheap models for read-heavy research. |
| **Independent judge (diversity)** | a *second*, architecturally-different judge to break correlated blind spots | a different family (e.g. GPT-5.x / Gemini 3.1) or a fine-tuned small judge | Diversity is the point — see §7. |

Rules: (1) the orchestrator never names a model inline — it reads the tier from policy; (2) `/research` re-verifies the policy monthly; (3) be skeptical of <1-month-old releases until an *independent* benchmark (SEAL, SWE-Bench Verified) re-scores them.

### 2.2 Harness — this is where the real leverage is
- **Claude Code** (terminal/IDE/web) + **Claude Agent SDK** (TS/Python) — build/prototype here; programmatic tool calling for parallel tool execution.
- **Claude Code Routines** (now GA on Pro/Max/Team/Enterprise) — the **AFK backbone**: cloud-hosted agents triggered by cron (≥1h), an API `/fire` endpoint, or GitHub PR/release events; run promptless in a cloud sandbox with per-routine secret vaults.
- **Managed Agents** dashboard — session monitoring, environment-based permissions, and **cost tracking by workflow/model/tool** (the operator's cost-control surface).
- **Claude Cowork** — the GUI for the non-technical operator (§8).
- **GitHub Actions** (`claude-code-action@v1`) — CI gate + `@claude` PR-fix lane.
- Billing note: as of **June 15, 2026**, Agent SDK usage is metered separately from interactive credits — budget for it (§11).

### 2.3 Subscription-first
Run on a Claude Pro/Max subscription; no API keys required (a subscription token covers the `@claude` lane). API keys are an optional alternative only. This keeps operator setup to "log in."

---

## 3. The control plane = the repository (state lives in files, not context)

The system's memory is the repo, so any agent can resume cold. Three tiers (mirrors the 2026 Managed-Agents memory model):

- **Constitution** — `CLAUDE.md` (≤150 lines, always loaded): session protocol, decide-don't-ask, hard prohibitions. This is the read-only "org standard."
- **Backlog/state** — `roadmap/features.json`, written **only** by one audited script (`update-state.ts`); `passes:true` exists only with evidence on disk. Plus `PROGRESS.md` (handoff log), `DECISIONS.md` (ADR-lite), `QUESTIONS.md` (escalations, non-blocking), `STATUS.md` (operator-facing). This is the "project store."
- **Working memory** — per-session lessons, briefs, evidence files. Curated in the background by **Dreaming** (extracts patterns across past sessions, merges duplicates) so the system gets smarter without bloating context.

Context discipline: pass context to subagents **explicitly** (shared files / event payloads) — subagents do *not* inherit the orchestrator's context; enable **compaction** at the 150k-token threshold.

---

## 4. The orchestrator loop (the core engine)

One cycle, run by the orchestrator (the "engineering manager"):

```
SELECT  highest-priority backlog item (deps met, attempts < 2)
 → BRIEF  fan out cheap explorer subagents → write a self-contained, immutable brief
 → BUILD  one builder subagent on a feat/ branch, scoped to authorized paths
 → VERIFY scripts/verify.sh (typecheck+lint+tests+state-validate+guards) → evidence saved
 → JUDGE  fresh-context evaluator (PASS/NEEDS_WORK); + security-reviewer on sensitive paths
 → SHIP   PR → develop, merge only on green CI
 → RECORD prepend PROGRESS.md, log judgment calls in DECISIONS.md
 → KAIZEN one ≥1% improvement to the system itself
 → LOOP
```

Orchestration rules (verified 2026 guidance):
- **Pattern:** orchestrator-subagent (Anthropic's recommended default; handles the widest range with least coordination overhead). Multi-agent orchestration supports up to ~20 parallel specialists in public beta.
- **Parallelize only** independent subtasks that each take **2+ minutes** — parallelizing short tasks wastes more on startup than it saves. Four 30-second tasks: run sequentially. Four 2-minute tasks: parallel saves ~8 min.
- **Fork-mode** subagent spawning to inherit the parent prompt cache (20–40% cheaper first request); only spawn "fresh" when you explicitly need isolation.
- **All delegation at the orchestrator level** — subagents can't spawn subagents (nesting is one level).
- **Outcomes** (grader-agent pass, +8–10% success on artifacts): use for high-value deliverables, with a *conservative* iteration budget (Outcomes iterate to budget exhaustion, not to a success signal).

---

## 5. Full AFK autonomy — the unattended backbone

**Engine:** Cloud **Routines** are the primary AFK mechanism — they survive a closed laptop and run promptless.
- **Nightly `/work` routine** (cron, e.g. 02:00) drains the backlog through the loop in §4.
- **Weekly hygiene routine** (deps, security, doc freshness, dead-code).
- **GitHub-event routine** for `@claude` PR fixes on CI failure.
- **API `/fire`** for on-demand "go" from the operator's GUI.
- Dev-phase only: session-scoped **`/loop`** (1–60 min adaptive) when iterating live; note it only fires while the session is open and idle.

**Approval delegation:** **Auto Mode** (a Sonnet-4.6 classifier, default-on for Opus 4.8) catches ~83% of over-eager actions and lets unattended runs proceed without halting on prompts — configured with `hard_deny`/`soft_deny`/`allow` rules so destructive ops are blocked, routine ops flow.

**Decide-don't-ask:** minor/reversible choices → pick the conventional option, log one line in `DECISIONS.md`, continue. Genuine blockers → log in `QUESTIONS.md` (non-blocking) and **skip to the next item**; a run ends with work done, never a question mark.

**Cost/runaway caps:** every routine sets `--max-turns` and a token budget; workflow timeouts prevent runaway jobs (GitHub minutes *and* model tokens both cost money).

---

## 6. Guardrails & safety — the part that earns the "autonomous" claim

> This is the highest-stakes section. 188 confirmed autonomous-agent direct-harm incidents (incl. a deleted `C:` drive and a 9-second DB+backups wipe) and a 340% YoY surge in prompt-injection mean **model good behavior is not a control.** Defense-in-depth is mandatory.

1. **Isolation (deny-by-default).** Run builders in a sandbox/throwaway context: git **worktrees** for parallel file isolation; OS sandbox (Seatbelt/bubblewrap/gVisor) or a MicroVM for anything touching the system; never the operator's primary machine for unattended runs (use the cloud sandbox). Time-bounded, memory-limited execution.
2. **Zero-trust egress.** Outbound network deny-by-default; allowlist only the registries/APIs a task needs. (Routines default to "Trusted" network; custom domains require explicit allowlist.)
3. **Secrets via runtime injection, never env vars.** Env vars leak into crash logs, child processes, and tool output. Use per-routine secret vaults / MCP runtime injection; rotate on leases; one kill-switch.
4. **Mechanical hooks (the proven layer in this repo).** `PreToolUse`/`Stop`/`SessionStart` hooks that *deterministically* block: secret reads (`.env`), destructive commands (`rm -rf` of root/home, recursive deletes), pushes to `main`/`master`, exfil-shaped uploads, and deletion/weakening of test assertions (the "assertion-shield"). Hooks block; the model can't talk its way past them.
5. **Evidence-gated, branch-protected merges.** Nothing reaches the stable branch without green CI + human QA; `features.json` is writable only by the audited script; `passes:true` requires a real `verify.log` on disk; CI re-runs the *real* gate on every PR. No force-push.
6. **The Rule of Two.** An agent should have at most two of {processes untrusted input, accesses sensitive systems, can change external state}. For untrusted input (public issues, registry/package descriptions, web content) use a **dual-LLM** pattern — a quarantined reader summarizes, a privileged actor never sees raw untrusted text (Spotlighting markers around it).
7. **Irreversible-op approval + immutable backups.** Database mutations, deletions, credential access, large diffs, or 2nd retries require human approval. Backups live in a **separate account with separate credentials, immutable**, and recovery is tested quarterly (the PocketOS lesson: the agent deleted the backups too).
8. **Supply-chain checks.** Verify dependency names against the registry (hallucinated/typo-squat/bait packages are a documented 2026 vector); pin versions; no `curl | sh`; no install of packages with surprise postinstall scripts.

---

## 7. Verification & continuous evaluation (self-testing)

The 2026 consensus: evaluation is **60–80% of engineering effort**, two-layered, and judges are validated systems — not oracles.

- **Layer 1 — deterministic gates (100% coverage, ~zero cost):** `scripts/verify.sh` = typecheck + lint + unit tests + schema/state validation + the guard-contract tests. Plus E2E for any UI. Deterministic assertions catch format/schema/policy violations cheaply and reliably; lead with these.
- **Layer 2 — judges (for nuance), de-correlated:** a **fresh-context** evaluator grades the diff+evidence against acceptance criteria; a **security-reviewer** runs on sensitive paths. To beat the documented correlated-blind-spot failure of same-model ensembles, make the second judge **architecturally diverse** (different family or a fine-tuned small judge) and require **≥2/3 consensus to kill a finding**. Calibrate judges (target Krippendorff's α ≥ 0.80 vs. a human-labeled golden set) before trusting them; recalibrate after model updates (temporal drift is real).
- **Layer 3 — production monitoring → test coverage:** every escaped failure becomes a new golden-set case and a new deterministic test. Offline suites are correlated blind spots; the feedback loop is what closes them.
- **Honest limit to state plainly:** LLM judges agree with humans ~85% on average but drop to 64–68% on hard domain tasks and can fabricate justifications. The judge layer reduces — not eliminates — risk; an external human review found real bugs this exact loop missed. Human QA remains the final gate.

---

## 8. The non-technical operator interface

Design target: the operator is a **business client**, not an engineer — never reads code, never debugs, never makes implementation calls.

- **Surface:** **Claude Cowork** (GUI) + a simple sidebar of upcoming runs / past results / one-click "go." No terminal.
- **Input = outcomes, not steps.** Plain-English goals ("customers can reset their password by email"), seeded from **pre-built templates** rather than a blank canvas (blank canvases cause misaligned-goal failures — the agent optimizes the wrong thing).
- **Approval = risk-tiered** (the key anti-confirmation-fatigue move):
  - Tier 1–2 (routine, reversible): execute autonomously, logged.
  - Tier 3 (moderate): async approval queue.
  - Tier 4 (irreversible / money / external-facing / large diff): **synchronous human approval**, showing the *planned end-state* + reversibility flag + a "reject with edits" path + *why the agent is uncertain*.
- **Status = narrative, not dashboards.** A plain-English "morning pulse" (what shipped, what's blocked, what's next, cost) the operator reads in minutes. Dashboards stay live for transparency but are not the primary artifact.
- **Cost control:** Managed-Agents cost tracking with alerts at **80%** and auto-block at **100%** of budget (invisible cost overruns are a documented 2026 failure — agents can burn $10k/week unnoticed).
- **QA:** the operator clicks through finished features on a preview/staging link, guided by an auto-generated click-by-click QA pack. That click-through is the only human gate before promotion.

---

## 9. Self-improvement (the "sharpen the axe" loop)

Downtime is never idle:
- **`/kaizen` (daily):** ship one concrete ≥1% improvement to the *system itself* — a better brief, a faster gate, a removed failure cause, a new rule. Anything explained twice becomes a rule; anything done manually twice becomes a script.
- **Downtime/ProAct protocol:** when there's no feature to build — predict the next moves' unknowns and **pre-research** them; **pre-write briefs** so the next work starts instantly; **scan for problems** (drift, flaky tests, stale deps/docs) before they bite. Gate proactive work on a value score (relevance + knowledge-gap + incremental value + timeliness) so it doesn't become busywork — proactive compute is a trade-off, not unbounded.
- **Dreaming (background):** scheduled review of past sessions to extract patterns and curate memory (reported large completion-rate gains) without touching original session data.
- **Self-fix:** treat a repeated subagent failure as the *manager's* failure to provide good briefs/tools/conditions — fix the condition (better brief, better rule, better gate), not just the symptom. Skill-patch weak components from eval-failure data, validated against the test suite.

---

## 10. Build phases (how to actually stand it up)

- **Phase 0 — Control plane + safety (before any product code).** Repo layout, `CLAUDE.md`, `features.json` + the single writer, `verify.sh`, the hook guardrails, isolation/sandbox + egress + secret-injection, branch protection, CI. Acceptance: the gate and every guardrail have *their own* contract tests that pass. *(This repo demonstrates this phase works.)*
- **Phase 1 — First product slice + operator loop.** One thin end-to-end feature through the full loop; Cowork wired; risk-tiered approval; narrative status; click-through QA. Acceptance: operator ships a feature touching zero code.
- **Phase 2 — Scale autonomy.** Nightly + weekly **Routines**; parallel subagents for independent work; the two-layer eval suite with a calibrated, diverse judge panel; cost dashboard + budget caps.
- **Phase 3 — Self-improvement + hardening.** `/kaizen` cadence, downtime/ProAct, Dreaming, production-failure→test feedback, quarterly recovery drills, monthly `/research` model/tooling re-verification.

---

## 11. Cost model

- **Tiered spend:** Haiku/Sonnet for read-heavy/routine; Opus 4.8 for most building/judging; Fable 5 only for the hardest tasks. Fork-mode + compaction + file-state keep token use down.
- **Order-of-magnitude:** a small product ≈ \$50–200/week of agent credits (nightly work + hygiene + CI fixes); a large product running parallel builders+judges can reach \$5k–20k/week. The trade is tokens for developer-time.
- **Controls:** per-routine `--max-turns` + token budget; 80%/100% alerts + auto-block; account for the June-15 Agent-SDK credit separation.

---

## 12. Risks & mitigations (current)

| Risk | Mitigation |
|---|---|
| **Prompt injection** (340% YoY surge, 73% of deployments vulnerable) | Rule of Two; dual-LLM/Spotlighting for untrusted input; egress deny-by-default; hooks block exfil. |
| **Runaway destructive action** (deleted drives/DBs) | Sandbox/MicroVM isolation; mechanical deny-hooks; irreversible-op human approval; immutable isolated backups + tested recovery. |
| **Correlated judge blind spots** | Diverse judge models + 2/3 consensus + deterministic-first gates + human final QA; calibrate (α≥0.80). |
| **Vendor-benchmark trust** | Default to independently-validated models; treat <1-month releases as unproven; `/research` monthly. |
| **Cost overrun** | Budget caps, 80%/100% alerts, tiered models. |
| **Key-operator / harness dependency** | Documented constitution + plan; portable pattern (state machine + gates + review) not locked to one model; OPERATOR_GUIDE for cold pickup. |
| **Supply-chain (bait/typosquat/hallucinated deps)** | Registry verification, version pinning, no surprise postinstall, no `curl\|sh`. |

---

## 13. One-time operator setup (~30 minutes, click-through only)

1. Log into Claude (Pro/Max) — no API key.
2. Click **Use this template** (or run the install script) to seed the repo + control plane.
3. Install the Claude GitHub App; set `develop` as default; protect `main`/`master` (PR + approval) and `develop` (PR + green CI).
4. Set a weekly budget + alert thresholds in the Managed-Agents dashboard.
5. Create the nightly `/work` + weekly hygiene **Routines**.
6. Write the first roadmap in plain English (or pick templates); say "go."

---

## Sources (verified June 2026)
Anthropic: Claude Fable 5 / Mythos 5 announcement + model docs; Claude Opus 4.8 docs; Claude Code Routines, Auto Mode, Multi-agent Orchestration, Outcomes, Dreaming, Context-compaction, Managed Agents, and Cowork docs/changelogs. Independent: SEAL / SWE-Bench Verified leaderboards; "Best AI Coding Agents 2026" (Firecrawl); LangChain *State of Agent Engineering 2026*; Confident AI / Braintrust eval-pattern guides; OWASP 2026 prompt-injection report; documented 2025–26 agent-incident catalogs (PocketOS, Replit, Cursor/Opus). *(Vendor benchmarks are vendor-scaffolded; independent harness scores run materially lower — verify on your own metric.)*

> **Standing instruction:** anything in this plan about a model, tool, framework version, or price is perishable. Re-verify via live `/research` before relying on it; the field changed four times in the month this was written.
