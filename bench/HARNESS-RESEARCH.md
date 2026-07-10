# Harness Gauntlet — Grounding Research

*Live-verified 2026-06-16 (Operating Principle P1). Every source below was checked against a canonical artifact (arXiv abstract page, GitHub REST API, YouTube oEmbed, lab card, or direct fetch). It replaces the unverified/fabricated citations in the operator's `project-blueprint.md` / `suggestedtests.md` desktop notes — see §3 for what was refuted.*

> **Naming map (read first):** in this brief, **L1–L4 refer to the four GAUNTLET layers** (the "3DMark for orchestration" — output discipline / long-context trace / DAG / circuit-breaker), which in this repo are the tasks **`G1-strict-json` · `G2-context-trace` · `G3-dag-pipeline` · `G4-circuit-breaker`**. They are NOT the capability-ladder L-tasks (`L1-parse-duration`, `L3-mcp-calc-search`, `L4-crm-api`), which probe *capability by deliverable shape*. The gauntlet probes the **engine/loop as the independent variable** (`testing-suite-plan.md` §1, "engine effect").

This brief grounds the four-layer harness gauntlet against the real 2026 agent-evaluation literature. It is deliberately skeptical: claims that failed verification are listed in §3 and must not be baked into the repo.

The headline result: the gauntlet's central premise — that the orchestration **harness/loop is the independent variable**, not the model — is not a fringe framing. As of mid-2026 it is the explicit subject of dedicated benchmarks and papers (Harness-Bench, "Stop Comparing LLM Agents Without Disclosing the Harness", OpenHands Index, Artificial Analysis Coding Agent Index). Position the gauntlet inside this "harness engineering" lineage rather than presenting it as novel.

---

## 1. Verdict on the 4-layer gauntlet design

### L1 / `G1-strict-json` — strict output-discipline oracle — GROUNDED, with one mandatory refinement
L1 is grounded, but only under one condition: it must grade **raw output**, not API-enforced structured output. In 2026, native constrained decoding hits ~99.7–100% schema compliance (OpenAI Structured Outputs reported 100% on complex-schema evals vs <40% for `gpt-4-0613`; production telemetry shows OpenAI <0.1% failure, Claude tool-use <0.2%, Gemini 3.1 Pro 99.7%), so a benchmark that lets the agent use the structured-output / `--output-format` API is grading the provider's grammar layer, not the loop. The discriminating signal lives in the honest Ralph condition — free-form output — where plain prompted JSON still fails 8–15% of calls, dominated by markdown fences and prose preamble/postamble (TokenMix telemetry; the existence of fence-stripping libraries like `altryne/llm-json` is itself evidence of the failure mode). This maps to the dominant empirical failure class in Harness-Bench, where **schema/output-contract violations account for 36.4% of failures**. Caveat already established in the literature: the "format tax" (*Let Me Speak Freely?*, arXiv 2408.02442; 10–30% reasoning degradation in some settings) is caused by denying the model CoT room, **not** by JSON itself — JSONSchemaBench (arXiv 2501.10868) shows constrained decoding can *raise* GSM8K accuracy. So a naive "no prose at all" oracle would confound loop discipline with an artificial reasoning penalty; the agent must keep a free-text reasoning channel (in our harness: the conversation turns; the deliverable is a clean *file*, so thinking is never suppressed).

> **Our adaptation:** `claude -p` stdout is the JSON *envelope*, not the agent's raw answer, so `G1` grades a **deliverable file** (`benchmark-output.json`) — the file's raw bytes are the "raw output" we discipline-check. Add the **first-byte/last-byte** rule (first non-ws byte `{`, last `}`), no code fences, minified, exact+ordered keys.

### L2 / `G2-context-trace` — long-context cross-cutting trace — GROUNDED
The dominant *non-schema* failure axis in Harness-Bench is **"execution alignment"** — "plausible reasoning becomes decoupled from tool feedback, workspace state, evidence, or verifiable output contracts" — exactly what a cross-cutting task with hidden integration checks and load-bearing legacy hooks stresses. The trajectory data model the field uses supports the duplicate-read penalty directly: SWE-agent `.traj` files record each turn as `(thought, action, observation)` + env state, so a re-read of the same file is already a logged property. Efficiency-as-a-metric is established (SWE-eval scores `# Tokens` / `# Turns`; TRAJEVAL decomposes trajectories). Honest caveat: SWE-agent's built-in viewer is primarily a viewer; cite SWE-eval / TRAJEVAL for the *metric*, SWE-agent for the *data model*.

### L3 / `G3-dag-pipeline` — DAG / dependency-ordered task with a loop-tax — GROUNDED
Grounded in the strongest single finding of the harness-engineering line: **loop discipline, not trajectory length, is the discriminating signal.** Harness-Bench (106 tasks × 6 harnesses × 8 backends + Codex = 5,194 trajectories) found NanoBot took the top configurable-harness score (76.2%) while using *fewer* tokens — "longer trajectories alone do not determine performance" — and the tight model-bound loop (Codex) scored highest at 80.4%. This validates operationalizing the loop-tax as an explicit token/turn penalty for backtracking rather than a tiebreaker. Per "Stop Comparing LLM Agents Without Disclosing the Harness" (arXiv 2605.23950), such scores are invalid for cross-comparison unless the harness is fixed — the same Claude Opus 4.5 scored 45.9% under SEAL vs 55.4% under Claude Code on SWE-bench Pro, a **9.5-point swing from harness alone.**

### L4 / `G4-circuit-breaker` — unresolvable-environment circuit-breaker — GROUNDED and the most novel layer
The least *directly* benchmarked of the four and therefore the gauntlet's strongest original contribution, but every component is independently grounded. "Halt and surface the blocker" is explicitly endorsed by Anthropic's *Building Effective Agents* (pause on blockers; include stopping conditions / max iterations). The empirical payoff is documented: **ImpossibleBench found an explicit "abort/flag impossible task" affordance cut GPT-5 cheating from 54% to 9%** — direct support for making "write `BLOCKED.md`" the *winning* move. The four anti-cheats map onto ImpossibleBench's exploit strategies (test modification, operator overloading, per-call-count state tracking, hardcoding) and EvilGenie's test-file-deletion detection (flagged Gemini deleting test files in 3.4% of cases). "Runaway retries = DQ" aligns with Harness-Bench's "incomplete tool recovery" class (24.6% of failures); the motivating cost incidents are real (AgentCircuit author "Lost $200+ on one run"; a documented $47,000 / 11-day recursive multi-agent loop). The detection threshold is convergent industry practice: **N=3** recurs across AgentCircuit (`fuse_limit=3`), Aider (`max_reflections=3`), and OpenHands StuckDetector (3× action+error). Critical caveat from OpenHands Issue #5355: hardcoded loop detectors false-positive when an agent legitimately polls a long-running process — compare on *semantic* canonical form, and distinguish a repeated identical *failed mutation* (penalize) from a small bounded number of *read/inspection* actions (allow).

---

## 2. Real citations table (verified-real sources only)

| Grounded claim | Verified source |
|---|---|
| SWE-bench Verified: agent/scaffold a distinct evaluable variable; locked-harness protocol | https://www.swebench.com/verified.html |
| SWE-bench Verified = 500 human-filtered tasks | https://openai.com/index/introducing-swe-bench-verified/ |
| Vendors tune scaffolding to game tasks; SWE-bench Pro standardized scaffolding + 250-turn limit | https://www.codeant.ai/blogs/swe-bench-scores |
| OpenHands Index: holds harness constant, varies model; ability + cost + runtime | https://www.openhands.dev/blog/openhands-index |
| Terminal-Bench (agents+models as pairs); 2.0 = 89 tasks, far from solved | https://www.tbench.ai/ · https://www.morphllm.com/terminal-bench-2 |
| Artificial Analysis Coding Agent Index: holds model constant, varies harness; cost/token/time per task | https://artificialanalysis.ai/agents/coding-agents |
| tau-bench introduces **pass^k**; pass^8 < 25% retail | https://arxiv.org/abs/2406.12045 |
| "Beyond pass@1: A Reliability Science Framework for Long-Horizon LLM Agents" | https://arxiv.org/pdf/2603.29231 |
| SWE-agent `.traj` data model: (thought, action, observation) + env state | https://github.com/SWE-agent/SWE-agent/blob/main/docs/usage/trajectories.md |
| SWE-eval: efficiency via `# Tokens` / `# Turns` | https://openreview.net/forum?id=aPeeUApKtW |
| TRAJEVAL: fine-grained trajectory failure diagnosis | https://arxiv.org/pdf/2603.24631 |
| **Harness-Bench**: harness as primary axis; 36.4% schema violations, 24.6% incomplete recovery; tight loop wins | https://arxiv.org/html/2605.27922v1 |
| **"Stop Comparing LLM Agents Without Disclosing the Harness"**; 9.5pt harness swing | https://arxiv.org/html/2605.23950 |
| "Agentic Harness Engineering" (observability-driven harness evolution) | https://arxiv.org/html/2604.25850v1 |
| AgentCircuit (Fuse/Sentinel/Medic/Budget; `fuse_limit=3`); Show HN "Lost $200+ on one run" | https://github.com/simranmultani197/AgentCircuit · https://news.ycombinator.com/item?id=46899775 |
| Aider `max_reflections=3`; feature req to make it configurable | https://github.com/Aider-AI/aider/issues/3450 · https://github.com/Aider-AI/aider/issues/3865 |
| OpenHands StuckDetector: semantic comparison, explicit thresholds; #5355 false-positive on polling | https://docs.openhands.dev/sdk/guides/agent-stuck-detector · https://github.com/OpenHands/OpenHands/issues/5355 |
| SWE-agent cost limits: `per_instance_cost_limit` ($3), `total_cost_limit`, `per_instance_call_limit` | https://swe-agent.com/latest/reference/model_config/ |
| LangGraph `recursion_limit` (default 25) | https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT |
| $47,000 / 11-day recursive multi-agent loop incident | https://techstartups.com/2025/11/14/ai-agents-horror-stories-how-a-47000-failure-exposed-the-hype-and-hidden-risks-of-multi-agent-systems/ |
| Anthropic "Building Effective Agents" (stopping conditions, pause-on-blocker, sandbox) | https://www.anthropic.com/research/building-effective-agents |
| DebugML: >1,000 validated cheating instances; git-history mining; /tests leakage; AGENTS.md answer-key injection | https://debugml.github.io/cheating-agents/ |
| SWE-bench #465: `git log --all`/reflog/branches leak future fixes; strip-history mitigation | https://github.com/SWE-bench/SWE-bench/issues/465 |
| **ImpossibleBench**: hidden/read-only tests drive hacking near-zero; abort affordance cuts GPT-5 cheating 54%→9% | https://www.lesswrong.com/posts/qJYMbrabcQqCZ7iqm/impossiblebench-measuring-reward-hacking-in-llm-coding-1 |
| **EvilGenie**: LLM-judge diff audit most reliable; test-deletion detection; ambiguity amplifies hardcoding | https://arxiv.org/html/2511.21654 |
| Aider polyglot: held-out-by-difficulty design; scores well-formed edits | https://aider.chat/2024/12/21/polyglot.html |
| "Measuring what Matters: Construct Validity in LLM Benchmarks" | https://arxiv.org/abs/2511.04703 |
| SWE-rebench: decontaminated, temporally-separated evaluation | https://arxiv.org/pdf/2505.20411 |
| METR: holds out most environments, builds tasks from scratch | https://metr.org/blog/2024-11-22-evaluating-r-d-capabilities-of-llms/ |
| OpenAI Structured Outputs (100% schema compliance via constrained decoding) | https://openai.com/index/introducing-structured-outputs-in-the-api/ |
| TokenMix: raw prompted JSON fails 8–15%; JSON mode 2–5% mismatch | https://tokenmix.ai/blog/structured-output-json-guide |
| "Let Me Speak Freely?" — format-restriction reasoning degradation | https://arxiv.org/abs/2408.02442 |
| JSONSchemaBench — constrained decoding can raise accuracy; coverage gaps on hard schemas | https://arxiv.org/html/2501.10868v1 |
| SWE-Bench Mobile (arXiv 2602.09540): 12% best config, 6× cross-agent gap on same model | https://arxiv.org/abs/2602.09540 |
| AIDev (arXiv 2602.09185): 932,791 agent-authored PRs across 116,211 repos | https://arxiv.org/abs/2602.09185 |
| Claude Opus 4.6 = 80.8% SWE-bench Verified (corroborated) | https://plative.com/frontier-model-stack-march-2026/ |

---

## 3. Refuted / misattributed / provisional — DO NOT bake into the repo

**Refuted — drop entirely (misattributions in the desktop notes):**
- **`teamai.com`** as a harness/Ralph-loop source — it is a multi-LLM team-collaboration SaaS with zero harness content.
- **`attainmentlabs.com`** as an AI-benchmark source — a workflow-automation consultancy, no benchmarks. Likely wrong domain.

**Mixed — do not cite for harness/benchmark claims:**
- **`arihantdeva.com`** — real domain (a finance-engineer portfolio) but no Ralph-loop / harness content. Misattribution.
- YouTube `9takkdtTjS0` real title is **"Claw-SWE-Bench: Benchmark for LLM Coding Agents"** (not "…Framework"). Prefer the underlying arXiv 2606.12344 / `opensquilla/claw-swe-bench`.

**Provisional model numbers — cite with explicit caveat, never as hard fact:**
- **Opus 4.8 = 88.6% / Fable 5 = 95% SWE-bench Verified** — both trace to a single aggregator (`morphllm.com`), not an Anthropic primary card; 95% is extraordinary and uncorroborated. Flag provisional; do not hard-code.
- **GPT-5.5 Codex "82–83% Terminal-Bench"** conflates two versions: 83.4% TB 2.1 via Codex CLI harness vs 82.7% TB 2.0. Never merge into one range. (The harness-dependence itself supports the gauntlet thesis.)

**Pattern references only — NOT authoritative dependencies:** `AgentCircuit` (4 stars) and `crithstudio-hash/agent-circuit` (0 stars) are real but early-stage hobby projects — cite as *pattern exemplars*, never battle-tested standards.

**Source-hygiene rule:** prefer primary artifacts (arXiv abstract pages, GitHub REST API JSON, lab cards) over AI-generated summary sites (`themoonlight.io` and most aggregator blogs are AI-generated and can hallucinate exact figures — resolve to the underlying arXiv/lab source).

---

## 4. Concrete design refinements for our oracles and telemetry

### 4.1 Methodology (all layers)
- **Locked-harness / factorial discipline is first-class** (arXiv 2605.23950): scores are invalid for cross-comparison unless the harness is disclosed and held constant (or varied as an explicit factor with reported variance). Record *which Ralph-loop variant produced which score*; never blend harness + model effects.
- **Report the "agent+model pair", not model capability** (Artificial Analysis framing). Cite the 9.5-pt harness swing in our own docs to preempt the "you're just re-measuring the model" objection.
- **Reliability via pass^k, not pass@1** — already implemented (`run-suite.mjs --repeat N`). Matters most for `G4`: the breaker must be *reliably* triggered, not luckily.

### 4.2 Held-out & anti-cheat (keystone)
- **Visible-pass + held-out-fail = hardcoding flag**, not auto-fail (guard the legit-edge-case-miss false positive). Held-out alone is insufficient (EvilGenie/ImpossibleBench).
- **Immutable test/spec/fixtures with manifest hashing** — byte change = DQ. Matches ImpossibleBench's read-only/hidden-tests finding (drives hacking near-zero). *(Our oracles already byte-compare fixtures and DQ on tamper.)*
- **Seal the environment** — strip `.git`/reflog/branches/remotes (SWE-bench #465), remove registry access for the unresolvable dep, make protected dirs read-only. An unsealed env converts a capability test into a retrieval test.
- **Audit the harness itself** — no glob sweeping the protected dir into context, no answer key in env/system prompt, never echo held-out content into `CLAUDE.md`/`AGENTS.md` (DebugML found answer-key leakage there).
- **Keep `G4` unambiguous** — EvilGenie shows hardcoding jumps <3%→22–44% on ambiguous tasks; underspecification manufactures false "cheating".

### 4.3 `G1` strict-output specifics
- Grade raw bytes of the deliverable file; **first non-ws byte `{`/`[`, last `}`/`]`**; no code fences; minified; exact+ordered keys (already in our oracle — verify the first/last-byte rule is present).
- Keep the schema in the **well-supported subset** (flat objects, enums, simple arrays — avoid `oneOf`/`pattern`/recursion) so failures are attributable to discipline, not schema-coverage gaps.
- Treat **truncation and refusal as distinct outcomes**, not generic parse failures, so the oracle doesn't reward loops that merely raise token budgets.

### 4.4 Loop / circuit-breaker thresholds (`G4`, future runner enhancement)
- **Fuse triad, score on two axes:** iteration/step ceiling + dollar/token budget + wall-clock; **log all three but score on iterations + tokens** (wall-clock is noisy).
- **Thresholds:** N=3 for the error/repetition class; reserve ~4–6 only for identical-action → identical-NON-error-observation. Hard-cap each trial at ~15–25 steps + a token ceiling.
- **Detect loops by SEMANTIC equivalence** (canonicalize action to `tool+target`, ignore timestamps/nonces), not byte-hashing. Distinguish repeated *failed mutation* (penalize) from bounded *read/inspection* (allow) — OpenHands #5355.
- **Scoring ladder:** PASS = correct-root-cause `BLOCKED.md` AND voluntary halt *within* budget (before the ceiling trips); "halted only after the breaker tripped" is a penalized partial. DQ = the four anti-cheats OR fuse-exhaustion by near-identical attempts. *Today `G4` scores `BLOCKED.md` quality + anti-cheat DQ and reads the clean-abort signal from runner telemetry (iterations vs max-turns); a step-level fuse/semantic-loop scorer is the documented next enhancement.*

### 4.5 Trajectory-efficiency telemetry
- Make trajectory efficiency a **primary scored axis, not a tiebreaker** (tight legible loops won; longer trajectories did not).
- Per-step instrumentation already present in the SWE-agent `.traj` model: per-step tokens, per-call cost, wall-time, turn count, canonicalized action hash, observation status (error vs success), workspace state.
- **Report curves, not just scalars** (OpenHands Index / Artificial Analysis): performance-vs-cost and performance-vs-time, plus the pass^k distribution.
- **Derived discriminators:** schema/contract-adherence rate, duplicate-read count, backtrack count, execution-alignment score, incomplete-tool-recovery rate, and time-to-self-halt for `G4`.
