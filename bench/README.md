# `bench/` — the effect-measurement harness

**Purpose:** answer *"did that engine change actually do anything, and was it the effect we expected?"* with numbers. This is **not** a code review. Per the operator's framing: if **output quality is the same or better**, **tokens are down**, **speed is up**, and **task benchmarks improve**, the change is a win — code-style is the least important thing.

It measures four dimensions per golden task:

| Dimension | How it's captured | Source |
|---|---|---|
| **Output quality** | graded vs an expected answer — **deterministic** where possible (set-match, exact, exec-the-code, regex), LLM-judge only where unavoidable | `bench/run.mjs` graders |
| **Token consumption** | `usage.{input,output,cache_read,cache_creation}_tokens` | `claude -p --output-format json` |
| **Cost (USD)** | `total_cost_usd` (⚠️ client-side *estimate* — see caveats) | same |
| **Speed** | wall-clock (`process.hrtime`) + the run's `duration_ms`/`duration_api_ms` | runner + JSON |

## First measured baseline (2026-06-15, develop @ 8fa66bc)
Ran the full suite live in both context modes — real numbers, not estimates:

| | quality | out-tokens | cost | note |
|---|---|---|---|---|
| `--ctx clean` (sandbox) | **7/7 ✓** | 1,028 | $0.4523 | every engine-component probe passes (judge-good ✓, judge-bad ✓ caught the fail-open, injection-resist ✓, rbac-reason ✓ "deny", codegen ✓) |
| `--ctx engine` (repo root) | **7/7 ✓** | 993 | $0.5179 | same quality |
| **delta (the context tax)** | no change | −3.4% (noise) | **+$0.0656 (+14.5%)** | **≈ $0.0094 per agent call** for the engine's own CLAUDE.md+hooks context, plus +0.3–4.3s latency/task |

**Reading:** the engine's loaded context costs ~1¢/call and some latency with **no quality benefit on these probes** — exactly the kind of overhead de-fluffing should shrink. Re-run `--ctx engine` after any context change and watch this number; that's the measurable payoff. (Local micro-bench, no API: `update-state --validate` 214 ms.)

## The measurement bridge
`claude -p "<prompt>" --output-format json` returns a JSON object with `result`, `structured_output` (when `--json-schema` is passed), `usage` (token counts incl. cache), `total_cost_usd`, a per-model cost breakdown, `duration_ms`, `num_turns`, and `session_id`. That single call is the whole bridge for task-level measurement. (Verified against `code.claude.com/docs/en/headless`, 2026-06-15.)

## Run it

```bash
# Local, no-API, no-credits — gate-latency micro-bench (runnable anytime):
node bench/micro.mjs            # fast
node bench/micro.mjs --gate     # also time the full verify.sh

# The golden-task suite (bills the Agent SDK credit pool — see caveats):
node bench/run.mjs --dry-run                 # validate tasks + print commands, NO API calls
node bench/run.mjs                            # run all tasks in a CLEAN sandbox cwd (reproducible)
node bench/run.mjs --ctx engine               # run from the repo root (full engine context loaded)
node bench/run.mjs --task codegen-slugify     # one task
node bench/run.mjs --baseline                 # run all + save a baseline
node bench/run.mjs --compare A.jsonl B.jsonl  # diff two result files (no API calls)
```

**Workflow to measure a change:** `run --baseline` → make the engine change → `run` again → `run --compare baseline new`. The deltas are the change's effect.

### `--ctx clean` vs `--ctx engine` — the context tax
`clean` runs each task from an empty `bench/sandbox/` (no project `CLAUDE.md`/hooks) → the model's raw cost on the task, reproducible run-to-run. `engine` runs from the repo root with the full engine context loaded. **The clean→engine delta is the engine's context tax.** Measured live on a trivial task: clean ≈ 21k cached context tokens; engine ≈ 35k → **the engine's own project context costs ~14k tokens / ~$0.01 per call**. De-fluff `CLAUDE.md`, re-run `--ctx engine`, and that number should drop — a direct, dollar-denominated test of whether a de-fluff change "did anything."

## What's in the suite (v0)
Seven self-contained, deterministically-graded tasks spanning the tiers the engine uses:

| Task | Tier/model | Grader | What it catches |
|---|---|---|---|
| `extract-roles` | fast/haiku | set-equals (json-schema) | structured-extraction quality; a token canary for context bloat |
| `summarize-bounded` | fast/haiku | word-count + key-term | conciseness; verbose regressions show as output-token inflation |
| `rbac-reason-deny` | sonnet | exact | single-hop reasoning + strict instruction-following |
| `codegen-slugify` | sonnet | **executes the output** vs hidden assertions | the builder's real job — SWE-bench in miniature |
| `injection-resist` | sonnet | negate-contains | prompt-injection resistance (a property that can *regress*) |
| `judge-good` / `judge-bad` | opus | exact verdict | the fresh-context evaluator's precision/recall on a labeled good+bad pair |

**Add a task:** drop a JSON in `bench/tasks/` — `{id, category, tier, model, prompt, [json_schema], grader:{type,...}, notes}`. Graders: `exact`, `contains` (+`negate`), `word_max`, `set_equals`, `codegen`.

## Interpreting results — honest caveats
- **Small-N is noisy.** Model nondeterminism means a single run's token/time numbers wobble. Treat <~10% token/time deltas as noise unless they repeat across runs; the runner prints this reminder. **Quality regressions (✓→✗) are the hard signal** — act on those first.
- **`total_cost_usd` is a client-side estimate.** For authoritative spend, reconcile against the Anthropic **Usage & Cost API**. Use the bench cost for *relative* comparison, not accounting.
- **`--ctx clean` is not zero-context.** It still loads Claude Code's system prompt + any user-level `~/.claude/CLAUDE.md` (constant across runs). It isolates the *project* context, which is what varies when you change the engine.

## The recommended next layer (verified against active repos, 2026-06-15)
This `run.mjs` is a zero-dependency **starting point + proof**. For a durable suite, adopt the production-proven tooling:

- **Framework layer — [promptfoo](https://github.com/promptfoo/promptfoo)** (~22.2k★, MIT, ships a documented Claude Agent SDK integration as of 2026-06-13). Wrap `claude -p` via its `exec`/custom-script provider; it tracks latency/tokens/cost, does side-by-side A/B of prompt or model variants, and gates CI on assertions. This is the most direct upgrade path from `run.mjs`.
- **[Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai)** (UK AISI, ~2.2k★, MIT, actively pushed) — institution-grade; `model_graded_qa()` for LLM-as-judge vs an expected target. **[DeepEval](https://github.com/confident-ai/deepeval)** (~16.2k★) — pytest-native, with agent metrics (Task Completion, Tool Correctness, Plan Adherence) for CI.
- **Task-performance benchmarks (objective, test-based, local, Docker):** **SWE-bench / SWE-bench Verified** (500 human-confirmed real GitHub fixes), **Terminal-Bench**, the **Aider polyglot** leaderboard, **LiveCodeBench** (date-window filtering for contamination control). These score by *running tests*, not LLM judgment — the gold standard for "task-specific performance." Run a small slice locally for the builder agent.
- **Live-loop telemetry (beyond isolated tasks):** Claude Code has **built-in OpenTelemetry export** — set `CLAUDE_CODE_ENABLE_TELEMETRY=1` to emit metrics/logs/traces (tokens, cost, latency, tool calls) for *real engine sessions*, not just `claude -p` probes. Point it at any OTel collector.

## NEEDS HELP / access / bridges (operator action)
| Want | Needs | Why |
|---|---|---|
| Reproducible `--bare` runs (zero project context, identical on every machine/CI) | an **`ANTHROPIC_API_KEY`** | `--bare` skips OAuth/keychain; subscription login can't use it. With a key, the bench runs hermetically in CI. |
| Authoritative cost (not estimates) | **Anthropic Admin/Usage & Cost API** key | reconcile `total_cost_usd` estimates against billed spend. |
| Real coding-task perf (SWE-bench Verified / Terminal-Bench) | **Docker** + disk + time (each is heavy) | these run real repos in containers and execute test suites. |
| Browser/UI task benchmarks (if a future build ships a UI) | **Playwright MCP** server (or the built-in browser control) | drive a rendered UI and assert on its state — out of scope for the engine-only template, but available if a build target needs it. |
| Live-loop token/cost/latency dashboards | an **OTel collector** (Grafana/Honeycomb/etc.) + `CLAUDE_CODE_ENABLE_TELEMETRY=1` | measure the *real* autonomous loop, not just probe tasks. |
| The framework layer (promptfoo) | `npm i -D promptfoo` (or `npx promptfoo`) | upgrade `run.mjs` → a maintained suite with A/B + CI gating. |
| Bigger judge-precision sets, held-out tasks, fixture-pinned repo-explore tasks | curation time (human or `/groom`) | v0 has a tiny labeled set; precision/recall needs ~20+ labeled cases per judge. |

**Budget note:** every `claude -p` task bills the **separate monthly Agent SDK credit pool** (effective 2026-06-15), not interactive usage. The full 7-task suite is a handful of cents per run; size your baseline cadence accordingly.

## LLM-as-judge (when deterministic grading isn't possible)
For fuzzy outputs, a model grades against a rubric (promptfoo `llm-rubric`, Inspect `model_graded_qa`, DeepEval `G-Eval`). Known pitfalls to control: **self-preference** (a model favors its own family's output — use a different judge model than the one under test), **position bias** (order of A/B affects the verdict — randomize/swap), and rubric vagueness (write concrete pass criteria). v0 deliberately avoids LLM-judge by choosing tasks with objective answers; add it only for categories that genuinely need it.
