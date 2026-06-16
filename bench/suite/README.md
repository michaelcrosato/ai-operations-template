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
```

## Telemetry captured (per the blueprint dashboard)
`oracle_score` (+ per-group breakdown) · `dq` (anti-cheat) · `built`/`finished` · token burn (in/out/cache) · `cost_usd` · `wall_ms` · **`iterations`** (= `num_turns`, the loop-count / architectural-stability metric). Records → `bench/results/suite-<task>-<ctx>-<sha>.jsonl` (gitignored).

## Tasks
| id | tier | category | oracle | status |
|---|---|---|---|---|
| `L3-mcp-calc-search` | L3 | mcp-server | MCP-over-stdio client: init + tools/list + tool calls (primary) + altered-param + error-handling (held-out) + corpus anti-cheat | **proven** — validity gate green; a live Sonnet build scored **1.0** ($0.13, 31s, 3 turns) |

### First measured result (the Phase-1 proof)
A clean Sonnet build of `L3-mcp-calc-search` scored **1.0** (handshake 1/1 · discovery 2/2 · primary 4/4 · held-out 4/4), built+finished, **in 3 turns / $0.13 / 31s**. This is the machinery proven end-to-end: a real agent builds, the held-out suite confirms it isn't hardcoded, and the dashboard fills with numbers — exactly the "is this change a win?" signal the suite exists for.

## Adding a task
1. Write `task.md` + `meta.json`, drop fixtures in `fixtures/`.
2. Write `solution/` (a real deliverable) and `oracle/verify.mjs` (primary + held-out + anti-cheat).
3. Write `oracle/validate.mjs` and **make it pass** — the oracle must score the reference 1.0 *and* catch every cheat (off-by-one, hardcoded/overfit, missing piece, crash, tamper). **A task is not admitted until its validity gate is green.**
