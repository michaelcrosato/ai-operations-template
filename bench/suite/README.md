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
| `L1-parse-duration` | L1 | module | import-the-module + hidden unit tests: stated behaviors (primary) + altered-value cases the agent never saw (held-out — the anti-overfit; no fixture to tamper, so held-out *is* the anti-cheat) | **proven** — validity gate green (hardcode/off-by-one/missing-export/always-throws all caught); a live Sonnet build scored **1.0** ($0.14, 33s, 3 turns) |
| `L3-mcp-calc-search` | L3 | mcp-server | MCP-over-stdio client: init + tools/list + tool calls (primary) + altered-param + error-handling (held-out) + corpus anti-cheat | **proven** — validity gate green; a live Sonnet build scored **1.0** ($0.13, 31s, 3 turns) |
| `L4-crm-api` | L4 | greenfield-app | HTTP acceptance suite: CRUD+filter round-trips (primary, partial) + **RBAC viewer-can't-write (gating)** + referential-integrity 409 (gating) + validation/held-out (partial); a failed gate caps the score at 0 | **proven** — validity gate green (incl. broken-RBAC→0); a live Sonnet build scored **0.93** (gates passed, 1 primary miss; $0.11, 28s, 2 turns) |

### Measured results (the proof)
- **`L1-parse-duration`** — a clean Sonnet build scored **1.0** (primary 5/5 · held-out 7/7) in **3 turns / $0.14 / 33s**. A **third oracle type** (import-the-module + hidden unit tests, the Aider-polyglot pattern) on top of L3's protocol oracle and L4's gated-HTTP oracle — the machinery generalizes across deliverable shapes. The validity gate proves a server that *hardcodes the four primary answers* scores **0.64, not 1.0**: the held-out set is what makes the score mean something.
- **`L3-mcp-calc-search`** — a clean Sonnet build scored **1.0** (handshake 1/1 · discovery 2/2 · primary 4/4 · held-out 4/4) in **3 turns / $0.13 / 31s**. Machinery proven end-to-end: a real agent builds, the held-out suite confirms it isn't hardcoded, the dashboard fills with numbers.
- **`L4-crm-api`** — a clean Sonnet build scored **0.93** (primary 4/5 · **rbac 4/4** · **integrity 2/2** · validation 4/4) in **2 turns / $0.11 / 28s**: a near-complete CRM with one functional gap, **partial-credited *because the security gates held*** — exactly the signal the suite exists for. The same oracle's `validate.mjs` proves a broken-RBAC build scores **0**, not a deceptive 0.65.

> Authoring note: the CRM oracle uses raw `node:http` (`agent:false`) rather than `fetch`, and **health-polls** a known `PORT` instead of scraping a stdout line — fixing a Windows undici teardown crash and a launch-detection brittleness that false-failed a working server. *The hard part really is the oracle; both bugs were caught by running it, not reading it.*

## Adding a task
1. Write `task.md` + `meta.json`, drop fixtures in `fixtures/`.
2. Write `solution/` (a real deliverable) and `oracle/verify.mjs` (primary + held-out + anti-cheat).
3. Write `oracle/validate.mjs` and **make it pass** — the oracle must score the reference 1.0 *and* catch every cheat (off-by-one, hardcoded/overfit, missing piece, crash, tamper). **A task is not admitted until its validity gate is green.**
