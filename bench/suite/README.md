# `bench/suite/` — end-to-end tasks with objective oracles

This is the real benchmark layer described in [`../testing-suite-plan.md`](../testing-suite-plan.md): an agent **builds a deliverable**, then a deterministic **oracle** scores it — primary checks + **held-out altered-parameter checks** (kills hardcoded answers) + an **anti-cheat diff** (DQ if the agent altered the spec/fixtures). No LLM judge. The verification model follows the project blueprint's "uncheatable local evaluation" step.

## Task layout (one dir per task, the Terminal-Bench quadruple)
```
<task-id>/
  task.md          # the prompt the agent receives
  meta.json        # tier, category, oracle weights, budget, entrypoint
  fixtures/        # files placed in the agent's working dir (e.g. corpus.json)
  solution/        # a REFERENCE deliverable that scores 1.0 (proves the oracle is satisfiable)
  oracle/
    verify.mjs     # the oracle: drives/inspects the deliverable, scores it [primary + held-out + anti-cheat]
    validate.mjs   # the validity gate: proves verify.mjs passes the reference AND catches cheats
```

## Run it
```bash
# 1. Validity gate (free, no API) — MUST pass before a task is trusted:
node bench/suite/L3-mcp-calc-search/oracle/validate.mjs    # ref scores 1.0; off-by-one/hardcoded/missing/crash/tamper all caught

# 2. Score the reference (free):
node bench/suite/L3-mcp-calc-search/oracle/verify.mjs

# 3. End-to-end: an agent builds it, then the oracle scores it (bills the Agent SDK credit pool):
node bench/suite/run-suite.mjs L3-mcp-calc-search [--ctx clean|engine]

# 4. Harness self-test (free, no API) — proves the runner's own pass/reliability logic is correct:
node --test bench/suite/lib/reliability.test.mjs

# 5. Engine-effect A/B (bench/ENGINE-EFFECT-PLAN.md): baseline (A0) vs review-fix (A3), model PINNED:
node bench/suite/run-effect.mjs H1-notes-ownership --repeat 3 [--model haiku|sonnet|opus]
```

## Telemetry captured (per the blueprint dashboard)
`oracle_score` (+ per-group breakdown) · `dq` (anti-cheat) · `built`/`finished` · token burn (in/out/cache) · `cost_usd` · `wall_ms` · **`iterations`** (= `num_turns`, the loop-count / architectural-stability metric). Records → `bench/results/suite-<task>-<ctx>-<sha>.jsonl` (gitignored). A run counts as a **pass** (for `pass^k`) only if it **`finished`** cleanly **∧** not `dq` **∧** `oracle_score ≥ pass_threshold` — a timed-out / errored build that left a scoreable artifact is never a pass (logic in `lib/reliability.mjs`, unit-tested).

## Tasks
| id | tier | category | oracle | status |
|---|---|---|---|---|
| `L1-parse-duration` | L1 | module | import-the-module + hidden unit tests: stated behaviors (primary) + altered-value cases the agent never saw (held-out — the anti-overfit; no fixture to tamper, so held-out *is* the anti-cheat) | **proven** — validity gate green (hardcode/off-by-one/missing-export/always-throws all caught); a live Sonnet build scored **1.0** ($0.14, 33s, 3 turns) |
| `L3-mcp-calc-search` | L3 | mcp-server | MCP-over-stdio client: init + tools/list + tool calls (primary) + altered-param + error-handling (held-out) + corpus anti-cheat | **proven** — validity gate green; a live Sonnet build scored **1.0** ($0.13, 31s, 3 turns) |
| `L4-crm-api` | L4 | greenfield-app | HTTP acceptance suite: CRUD+filter round-trips (primary, partial) + **RBAC viewer-can't-write (gating)** + referential-integrity 409 (gating) + validation/held-out (partial); a failed gate caps the score at 0 | **proven** — validity gate green (incl. broken-RBAC→0); after a task-validity fix (PUT ambiguity), live Sonnet builds score **1.0** and **pass^2** with gates held every run ($0.10–0.15/run, 2 turns) |
| `G1-strict-json` | G1 | gauntlet · output-discipline | raw-bytes `JSON.parse` + no-fence + minified + exact-ordered-keys (format) + live CSV-transform correctness with boolean/precedence/disabled-exclusion traps; **DQ if `accounts.csv` is altered** | **proven** — validity gate green (fenced/pretty/extra-file→format<1; dropped/disabled→correctness<1; tampered CSV→DQ 0); dogfood **pass^2** (1/1/1, 3 turns, $0.17/run) |
| `G2-context-trace` | G2 | gauntlet · long-context | source-only TTL patch + **live behavioral probe through the real module graph** (held-out timestamps) + **GATING integrity** (two peripherals byte-identical→else score 0) + trace-report hop naming | **proven** — validity gate green (peripheral damage→gated 0; reverted/hardcoded patch + bad trace caught); dogfood **pass^2** (1/1/1, 8 turns, $0.14/run) |
| `G3-dag-pipeline` | G3 | gauntlet · tool-sequencing | import-the-module + held-out: PLAN.md DAG-proxy (plan) + worked example (primary) + **7 unseen cases** incl. case-dedup/precedence/status (held-out = anti-cheat) | **proven** — validity gate green (no-plan→plan<1; naive/all-or-nothing/hardcoded→held-out<1); dogfood **pass^2** (1/1/1, 12 turns, $0.32/run) |
| `G4-circuit-breaker` | G4 | gauntlet · circuit-breaker | unresolvable-env: `BLOCKED.md` present+complete (blocked) + correct root-cause (rootcause); **DQ on faking the dep / removing it / stubbing the immutable `verify.mjs`**; clean-abort-vs-runaway rides runner telemetry | **proven** — validity gate green (cheats→DQ 0; missing/wrong-cause caught); dogfood **pass^2** (1/1/1, ~9.5 turns, $0.20/run) |
| `H1-notes-ownership` | H1 | headroom (engine-effect) | import-the-module: create/validate/read/owner-CRUD (primary) + **owner-only modify/delete = IDOR gating** (a non-owner editing/deleting → `forbidden`) | **validity-gated** (reference 1.0; IDOR build → gated 0; over-block caught). **No headroom yet:** the bare baseline is ceiling **1.0 at sonnet AND haiku** — modern models don't drop a clearly-stated rule (see [`../ENGINE-EFFECT-PLAN.md`](../ENGINE-EFFECT-PLAN.md) §8). The A0-vs-A3 harness target. |

### Measured results (the proof)
- **`L1-parse-duration`** — a clean Sonnet build scored **1.0** (primary 5/5 · held-out 7/7) in **3 turns / $0.14 / 33s**. A **third oracle type** (import-the-module + hidden unit tests, the Aider-polyglot pattern) on top of L3's protocol oracle and L4's gated-HTTP oracle — the machinery generalizes across deliverable shapes. The validity gate proves a server that *hardcodes the four primary answers* scores **0.64, not 1.0**: the held-out set is what makes the score mean something.
- **`L3-mcp-calc-search`** — a clean Sonnet build scored **1.0** (handshake 1/1 · discovery 2/2 · primary 4/4 · held-out 4/4) in **3 turns / $0.13 / 31s**. Machinery proven end-to-end: a real agent builds, the held-out suite confirms it isn't hardcoded, the dashboard fills with numbers.
- **`L4-crm-api`** — first dogfood landed a deterministic **0.93** (primary 4/5) across **three independent builds with the identical group breakdown**. A stable miss across three runs isn't model flakiness — it's a **task-validity defect**: the prompt's "PUT … same validation" was read (defensibly) as full-replace-requires-email, so a name-only PUT correctly 400'd. Fixed the spec + oracle to send the full body (valid under both readings); builds now score **1.0 / pass^2**, gates held every run. *This is the ABC dual-validity failure the plan warns about, caught by `--repeat`, not by eyeballing.*

### Reliability (`--repeat N` → tau-bench `pass^k`)
A single run is an anecdote, not a measurement. `run-suite.mjs --repeat N` runs N independent builds, appends to one JSONL, and reports pass-rate + score/cost/turn spread (+ **gate-hold rate** for gated tasks). Measured:
- **`L1-parse-duration` ×5** → **5/5 pass^5**, score 1/1/1, mean 2.2 turns, ~$0.08/run.
- **`L4-crm-api` ×3 then ×2** → after the PUT fix, **pass^2**, score 1/1/1, **security/integrity gates held on every run**, ~$0.10–0.15/run.

> Authoring note: the CRM oracle uses raw `node:http` (`agent:false`) rather than `fetch`, and **health-polls** a known `PORT` instead of scraping a stdout line — fixing a Windows undici teardown crash and a launch-detection brittleness that false-failed a working server. *The hard part really is the oracle; every one of these bugs — the teardown crash, the launch brittleness, the PUT over-spec — was caught by running it, not reading it.*

### The harness-property gauntlet (G-tier) — engine effect, not capability
The `L*` tasks above probe **capability by deliverable shape**. The `G1–G4` tasks are the second axis (`testing-suite-plan.md` §1, "engine effect"): a "3DMark for orchestration" that stresses the **loop itself** — output discipline, long-context retention, DAG trajectory, and circuit-breaker halt — from the operator's `project-blueprint.md` + the four-assistant `suggestedtests.md` convergence. Each is grounded in real 2026 eval literature (Harness-Bench, "Stop Comparing LLM Agents Without Disclosing the Harness", ImpossibleBench, EvilGenie) — see [`../HARNESS-RESEARCH.md`](../HARNESS-RESEARCH.md). All four are **validity-gated and dogfooded `pass^2`**:
- **`G1-strict-json`** — output discipline over a CSV transform with boolean/precedence/disabled-exclusion traps. Raw-bytes `JSON.parse` + no-fence + minified + exact-ordered-keys *together* enforce the blueprint's first-byte/last-byte rule (any preamble/fence makes the raw parse throw); DQ if the input is altered. Dogfood **pass^2** (1/1/1, format 6/6 · correctness 6/6). *Grades the deliverable file, not the `claude -p` JSON envelope — the harness-correct form of the blueprint's "raw stdout" rule.*
- **`G2-context-trace`** — long-context cross-cutting trace: a source-only TTL patch verified by a **live behavioral probe through the real module graph** (held-out timestamps catch a hardcoded value), a **gating integrity** group (two load-bearing peripherals must stay byte-identical, else score 0 — modeled on L4 gating), and a hop-naming trace report. Dogfood **pass^2** (1/1/1, patch 7/7 · integrity 4/4 · trace 5/5).
- **`G3-dag-pipeline`** — mandated Read→Plan→Write→Validate DAG: a `PLAN.md` proxy for the Plan phase (true tool-ordering rides `iterations` telemetry, not the oracle) + an import-the-module oracle with **7 held-out cases** (case-insensitive dedup, reason precedence, status states) as the anti-cheat. Dogfood **pass^2** (1/1/1, plan 4/4 · primary 4/4 · heldout 7/7).
- **`G4-circuit-breaker`** — unresolvable environment: the only legitimate move is a structurally-complete `BLOCKED.md` correctly naming the unfixable dependency; **DQ on faking the dep / removing it / stubbing the immutable `verify.mjs`**; the clean-abort-vs-runaway signal rides `iterations` vs `max-turns`. Dogfood **pass^2** (1/1/1, blocked 5/5 · rootcause 3/3). *Grounded by ImpossibleBench: an explicit "abort/flag impossible" affordance cut GPT-5 cheating 54%→9% — making `BLOCKED.md` the winning move is the right design.*

> `run-suite.mjs` gained backward-compatible **nested-fixture** support (mkdir -p the destination parent) so G2's `packages/*` monorepo stages correctly; flat-fixture tasks (L1/L3/L4/G1/G4) are unaffected.

## Adding a task
1. Write `task.md` + `meta.json`, drop fixtures in `fixtures/`.
2. Write `solution/` (a real deliverable) and `oracle/verify.mjs` (primary + held-out + anti-cheat).
3. Write `oracle/validate.mjs` and **make it pass** — the oracle must score the reference 1.0 *and* catch every cheat (off-by-one, hardcoded/overfit, missing piece, crash, tamper). **A task is not admitted until its validity gate is green.**
