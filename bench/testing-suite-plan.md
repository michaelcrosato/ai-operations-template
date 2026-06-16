# Testing-Suite Plan — a real, measurable benchmark for the engine
*Draft for review · 2026-06-15 · grounded in how the leading 2026 coding-agent benchmarks actually work (sources at bottom)*

## 0. The brutal thesis
The current `bench/` v0 (7 atomic prompts) is a **smoke test, not a benchmark.** It catches gross component regressions and measures token/cost, but it cannot answer *"did this engine change make us better at building real software?"* — because it never builds real software. To verify a change, we need **end-to-end build tasks, laddered by difficulty, each with an OBJECTIVE pass/fail oracle.**

And here is the part most homegrown suites get fatally wrong: **the oracle is the entire ballgame, and a broken oracle is worse than no benchmark.** The peer-reviewed best-practices framework (ABC, arXiv 2507.02825, Percy Liang/Stoica/Zaharia et al.) measured that flawed oracles distort reported agent performance by **up to 100% in relative terms**. Concretely, in audited public benchmarks: a trivial agent returning **empty responses scored 38%** on tau-bench; an agent that overwrote the test file with `assert 1 == 1` scored **100%** on SWE-Lancer; and **15.7% of "passing" patches on SWE-bench Verified were false positives**, flipping **24%** of the top-50 leaderboard. If our oracle is sloppy, we will confidently "measure" improvements that are noise or cheating. This plan is built oracle-first to avoid that.

**This draft was itself put through a brutal adversarial review before reaching you.** The fixes it forced are marked inline and are the parts most likely to save us from fooling ourselves: **gating criteria** so a build with broken RBAC can't score a "shippable-looking" 65% (§4); an explicit **statistical reality + "what this can't measure"** section, because N≥5 end-to-end runs *cannot* detect small continuous deltas above loop noise — those belong on the cheap deterministic tiers (§6.5); and the blunt admission that **authoring sound oracles is the hard, expensive, days-per-task part** — so Phase 1 builds and validates exactly *one* oracle before we scale, and no tier's numbers are trusted until its oracle passes the validity + flaky gates (§10).

---

## 0.5 Blueprint integration + Phase-1 status (DONE)
The operator's `project-blueprint.md` (telemetry-first, "uncheatable local evaluation") is folded in. Its specific sharpenings, now part of this plan:
- **Held-out altered-parameter suite** — beyond the primary checks, a *second* hidden set with parameters the agent never saw, to kill hardcoded/mocked returns. *(Implemented in the first task's oracle.)*
- **Anti-cheat diff = automatic disqualification** — post-flight, if the agent altered the spec/fixtures/oracle, the run is **DQ'd (score 0)**, not scored. *(Implemented: corpus-hash check.)*
- **Two more telemetry axes:** **iteration / loop count** (`num_turns` — architectural stability; fewer self-corrections is better) and **human-intervention score** (how often a run needed the human queue). *(Iteration count implemented; intervention score lands with the HITL queue.)*
- **Task-category weighting matrix** — the oracle weights shift by task *type*: **MCP/tooling** → schema-compliance + discovery + graceful errors (used by the first task); **greenfield app** → feature-completeness + persistence + `data-testid`; **refactor** → regression-stays-green + LOC/speed gains; **infra** → state-stability (port-ping, log syntax, zero crash-loops).
- **The 4-layer stress gauntlet** (a "3DMark for orchestration"), folded into L5: L1 rigid-format/negative-schema · L2 long-context retention · L3 6–8-step tool-chaining (no circular looping) · **L4 torture** — a deliberately broken environment where compilation always fails; the win condition is the engine **hitting its circuit-breaker (the two-strike limit) and exiting cleanly, NOT burning tokens in a runaway loop.** L4 directly tests the engine's failure-handling, which no capability benchmark does.
- **Daily human-batch multiplier** — failed/borderline runs land in a daily review queue; the engineer applies a binary **1.0 (genuine) / 0.0 (faked/brittle)** multiplier into the baseline (HITL as a batch gate, not micromanagement) — the engine's `awaiting_approval` pattern applied to the benchmark.

**Phase-1 status: DONE.** The first task — `bench/suite/L3-mcp-calc-search/` ("build an MCP server") — is built and **proven end-to-end**: its **validity gate is green** (the oracle scores the reference 1.0 and catches off-by-one, hardcoded/overfit, missing-tool, crash, and corpus-tamper), and a **live Sonnet build scored 1.0** (held-out 4/4) in **3 turns / $0.13 / 31s**. The machinery — agent builds → oracle verifies (primary + held-out + anti-cheat) → blueprint telemetry — works. Next: the L4 CRM (the harder flagship) and the L4-torture/circuit-breaker stress task.

## 1. What we measure — two axes, never conflated

1. **Capability** — can a *fresh* builder agent complete task X? (probes the model + the agent definition)
2. **Engine effect** — does the *full `/work` loop* (tiers, gates, fresh-context reviewers, evidence) produce a **better / cheaper / faster / more reliable** outcome than a baseline — **with the model pinned** so we isolate the engine's contribution from the model's. *This is the operator's real question.* If we don't pin the model, a model upgrade will masquerade as an engine win.

**Metric set per task** (copying the suites that matter):
- **Quality:** oracle score ∈ [0,1] (partial credit — §4), and binary resolved/not.
- **Reliability:** **pass^k** — the probability that *all* k independent runs pass (tau-bench). This is the axis where 2026 frontier agents actually collapse (GPT-4o pass^8 < 25% on tau-retail; gpt-4.1 drops 74%→34% on the hard dual-control domain). A change that lifts pass^1 but not pass^8 has not made the engine *production-reliable*. **We report pass^1 AND pass^k (k≥5), not pass^1 alone.**
- **Cost/speed:** tokens (in/out/cache), `total_cost_usd`, wall-clock — already captured by `bench/run.mjs`.
- **Engine-behavior flags** (unique to *our* benchmark): did it assign the right tier (A/B/C)? did the security-reviewer fire on the auth/RBAC code? did a Tier-C task correctly park in `awaiting_approval`? did the builder stay inside `authorized_paths`? did it escalate a genuinely-ambiguous task instead of hallucinating? These come from the engine's own state/logs and are pass/fail.

---

## 2. The Oracle Doctrine (non-negotiable rules, from ABC arXiv 2507.02825)

A task earns a place in the suite **only if** it satisfies all four:

1. **Dual validity.** *Task validity:* completing the task actually requires the capability we claim to test. *Outcome validity:* passing the oracle is equivalent to actually completing the task. Both must hold, or the number is a lie.
2. **Isolate the agent from ground truth.** The oracle tests live **outside the agent's writable space** and are **injected only after the agent finishes** (and the agent's run directory is read-only-checked for tampering). SWE-Lancer's 100% cheat happened because tests sat in an agent-readable zip. **Non-negotiable.**
3. **Sufficient coverage + adversarial augmentation.** Thin tests are exploitable even when human-authored (15.7% SWE-bench Verified false positives). Every oracle gets *negative* cases and edge cases, not just the happy path. We treat "tests pass" as necessary, not sufficient — and periodically augment with mutation testing (we already have `mutation-smoke` — same idea, applied to the task oracle).
4. **Resist degenerate solutions.** Include **negative/impossible/trap tasks** where the correct behavior is to refuse or escalate — so "do nothing" is *not* a free win (it scored 38% on tau-bench precisely because some tasks needed no action). For us this doubles as the test of the engine's ambiguity gate (§5).

### Oracle taxonomy (pick the cheapest objective one that gives dual validity)
| Oracle type | What it is | Leading suite using it | Our tiers |
|---|---|---|---|
| **Hidden test flip** | FAIL_TO_PASS goes red→green, PASS_TO_PASS stays green | SWE-bench Verified | L2 |
| **Own-suite reconstruction** | build a lib/service so *its own* unit+lint+typecheck suite passes | Commit0 | L3 |
| **End-to-end / acceptance tests** | human-authored app-flow tests (HTTP/Playwright), pass-on-fixed / fail-on-broken | SWE-Lancer, Terminal-Bench | L4 |
| **Protocol-conformance** | drive a running server over its wire protocol, assert spec compliance | MCP conformance suite | L3 (MCP) |
| **State-based reward** | hash the final DB/world-state vs a target produced by replaying reference actions | tau-bench / τ²-bench | L4–L5 stateful |
| **Abuse/red-team** | attack tests that must *fail to break* the build | (ABC negative cases) | L5 security |
| **Process oracle** | did the engine escalate/tier/gate correctly (from its own logs) | (engine-specific) | trap tasks, all tiers |

LLM-as-judge is **banned for scoring** (it's used only for task *curation*, as Terminal-Bench does). It's biased and gameable; we have objective oracles for everything in scope.

---

## 3. The difficulty ladder (L0 → L5)

Each tier below gives: **what it tests · prompt mode · an EXAMPLE prompt · the ORACLE · partial credit · budget · expected frontier pass-rate · cadence.** Difficulty is **calibrated empirically** (Aider-polyglot method: keep tasks that land in the 5–60% pass band for current frontier agents, so the suite neither saturates at 100% nor floors at 0% — both are uninformative).

### L0 — Micro probes *(exists: `bench/tasks/`)*
- **Tests:** component sanity (extraction, single-hop reasoning, judge discrimination, injection resistance). **Prompt:** thick, single-shot.
- **Oracle:** deterministic graders (set-match, exact, exec-codegen). **Partial credit:** n/a (binary).
- **Budget:** ~$0.45 / 7 tasks, seconds each. **Frontier:** ~100% (it's a smoke test). **Cadence:** every change / CI.

### L1 — Single-file module from spec
- **Tests:** can the builder write one correct, self-contained module? **Prompt:** thick (signature + behavior spec).
- **Example (thick):** *"Implement a `TokenBucket` rate limiter in `ratelimiter.js` exporting `take(key, n=1) → bool` and `refill()`. Capacity 10, refill 1 token/100ms per key. Output only the module."*
- **Oracle:** a **hidden** unit-test suite (timing-tolerant) injected after the agent finishes — the Aider-polyglot pattern. **Partial credit:** % of test cases passing.
- **Budget:** ~$0.10–0.30, <1 min. **Frontier:** 70–95%. **Cadence:** every change / CI.

### L2 — Multi-file fix in an existing codebase  → **ADOPT SWE-bench Verified, don't author**
- **Tests:** real-codebase comprehension + targeted multi-file change without regressions. **Prompt:** an actual GitHub issue.
- **Oracle:** the instance's hidden **FAIL_TO_PASS + PASS_TO_PASS** sets, run in the per-instance **Docker** harness (no LLM judge; 99.78% gold-patch reproducibility). **Partial credit:** instance-level binary, but we run a **fixed 20–30 instance slice** and score the fraction resolved.
- **Budget:** ~$0.50–2 / instance; the slice nightly. **Frontier:** mid-tier agents ~40–70% on Verified. **Cadence:** nightly / per-PR-to-develop.
- **Why adopt:** authoring sound multi-file oracles is exactly where homegrown suites fail; SWE-bench Verified is already human-vetted. **Caveat:** it is almost certainly in model training data → use it for *engine-effect* (model pinned) regression, **not** as a novel-capability claim, and date-window any new instances (LiveCodeBench method).

### L3 — Build a whole component from spec  *(the "build me an MCP server" tier)*
- **Tests:** build a coherent, spec-conformant component from scratch. **Prompt:** thick spec.
- **Example A — MCP server (the operator's example):** *"Build an MCP server (stdio transport, current protocol version) exposing three tools: `add(a:int,b:int)→int`, `search(query:str)→{title,url}[]` over the provided `corpus.json`, and `get_record(id:str)→Record|error`. Conform to the MCP spec."*
  - **Oracle (objective, cited):** (1) **protocol compliance** — `npx @modelcontextprotocol/conformance server --url <launched-server> --scenario server-initialize` → exit 0 + `checks.json` all-pass; (2) **behavioral** — `npx @modelcontextprotocol/inspector --cli <server> --method tools/list` asserts the 3 tools + schemas, then `--method tools/call --tool-name add --tool-arg a=2 --tool-arg b=3` asserts result `5`, fixtures for `search`/`get_record`, and the error path. **Partial credit:** weighted = (handshake .25) + (correct tool list/schemas .25) + (each tool's behavioral fixtures .5/3). **Harness realities (don't hand-wave these):** the oracle wrapper must (a) install Node + the MCP CLIs in the task env (don't assume they're present), (b) **launch the agent's server in a subprocess and health-check it** — a server that crashes on startup (bad deps, syntax error, port clash) scores **0**, not error-out; (c) ship the `corpus.json` fixture in the task env so `search`/`get_record` have defined expected results; (d) time-bound the launch.
- **Example B — library (Commit0 pattern):** *"Implement `csvkit`-lite per this README to pass its bundled test suite,"* oracle = the bundled `pytest` + `ruff` + type-check, run in Docker.
- **Budget:** ~$2–5, minutes. **Frontier:** Commit0 ~17%→26% — i.e., **genuinely hard**. **Cadence:** nightly / weekly.

### L4 — Multi-feature application  *(the "build me a CRM" tier)*
- **Tests:** the engine's actual purpose — a stateful, multi-file app with auth, data integrity, and real endpoints. **Prompt:** thick spec with numbered acceptance criteria (and a **thin twin**, §5).
- **Example (thick):** *"Build a CRM REST API. Entities: Contact, Deal, Activity. (1) CRUD for each with input validation (reject malformed). (2) RBAC: owner=all, editor=CRUD own records, viewer=read-only — non-permitted ops return 403. (3) `GET /deals?stage=&owner=` filters. (4) A Deal references a Contact; deleting a Contact with open Deals returns 409. Persist to SQLite. Seed via `npm run seed`."*
  - **Oracle (SWE-Lancer / Terminal-Bench pattern):** a **provided end-to-end acceptance suite** (HTTP-level, e.g. supertest/Playwright) that the agent never sees, injected post-build, covering each numbered criterion — *plus its negative cases* (RBAC denials return 403/404 not 200; validation rejects; the 409 integrity case). Each criterion = a weighted test group. **Authoring rule (critical):** every acceptance test must **pass on the reference solution and fail on an empty/broken build** (the SWE-Lancer triple-verify) — that is how we prove the oracle has dual validity before trusting its score.
  - **Partial credit WITH gating criteria (revised after adversarial review):** naive Σ(weight × fraction passing) is dangerous — a CRM with totally-broken RBAC could still score ~65% and *look shippable*. So criteria are split: **gating** criteria (security: RBAC denials; data integrity: the 409/constraint cases) are **pass-required** — failing any gating criterion **caps the task score at "FAIL/insecure" regardless of the weighted total**, and is reported as a distinct red flag, never averaged away. **Non-gating** criteria (CRUD breadth, filter richness) use weighted partial credit Σ(weight × fraction). So the headline is two numbers: *gates passed? (boolean)* and, only if gates pass, *quality % on the rest*. An engine change that moves the non-gating score 70%→85% with gates green is a win; one that lifts the % but breaks a gate is a **regression**. **State-based variant:** for the integrity criteria, hash a *normalized* DB dump (sorted rows, canonical types, fixed TZ — raw `SELECT *` order is nondeterministic and will flake) vs a target (tau-bench method).
- **Budget:** ~$10–30 (many loop cycles), tens of minutes. **Frontier:** partial — this is where agents lose points on RBAC/integrity/edge cases. **Cadence:** weekly / pre-release.

### L5 — Very hard: reliability, concurrency, security, and the trap
The tier with real headroom — where 2026 frontier agents *fail*, so it can both detect regressions and reward genuine gains.
- **(a) Stateful + reliability:** an L4-class task scored with **pass^k (k≥8)** + state-hash oracle. A change is only a reliability win if pass^8 moves, not just pass^1.
- **(b) Concurrency correctness:** *"Implement a job queue with exactly-once delivery under N concurrent workers."* **Oracle:** a stress harness that runs the workers and asserts no dup/lost jobs across many trials (a property/metamorphic oracle — not one golden output).
- **(c) Security (abuse oracle):** *"Add password reset to this app."* **Oracle:** a **red-team test suite** the build must *survive* — token reuse, host-header injection, user enumeration, timing. The agent must **not** introduce the vuln; score = fraction of attacks repelled. This directly stresses the engine's Tier-C + security-reviewer path.
- **(d) The TRAP task (tests the engine's judgment, not just the model):** a deliberately **ambiguous or self-contradictory** thin prompt — *"build me a reporting feature"* with no entities/output defined, or a spec whose two requirements conflict. **The correct outcome is to escalate to `QUESTIONS.md` / refuse, NOT to ship.** **Oracle (process):** pass iff the engine escalated to `QUESTIONS.md` and shipped nothing (read from its state/logs); **shipping anything is a FAIL.** This is the engine's ambiguity-gate value proposition under test — *and* it closes the "do-nothing exploit" by making refusal the *only* pass for this class. **It jointly tests engine+model** (the model must recognize the ambiguity AND the engine's gate must catch it), so score it as the **escalation rate over k runs** (a reliability number for the gate), not a single pass/fail — and read it carefully (an agent that bailed on a *dependency error* must not be miscounted as a correct *escalation*).
- **Budget:** ~$30–100+, long-horizon. **Frontier:** low. **Cadence:** pre-release / on-demand.

---

## 4. The task-authoring template (so every task is reproducible + valid)
Copy **Terminal-Bench's four-component quadruple** for every authored task:
```
bench/suite/<tier>/<task-id>/
  task.md           # the prompt + numbered acceptance criteria (thick) [+ thin twin]
  env/              # Dockerfile / compose — the isolated, reproducible environment
  oracle/           # the hidden test suite (asserts FINAL state; lives here, NOT in env/)
  solution/         # a REFERENCE solution that provably passes the oracle
  meta.json         # tier, prompt-mode, weights per criterion, budget, expected pass-band
```
**Two validity gates before a task is admitted** (this is what stops us shipping a broken oracle):
1. **Oracle passes on `solution/`** (outcome validity — a correct build scores 1.0).
2. **Oracle fails on an empty build and on a `solution/` with the key behavior deleted** (no false positives; "do nothing" ≠ pass). SWE-Lancer's "passes-fixed / fails-broken" check, mechanized.

---

## 5. Thin vs thick prompts (the operator's "how much detail?" question)
Detail level is a **dial we test on purpose**, not a thing to get "right" once:
- **Thick spec** (numbered, testable acceptance criteria, 1:1 mapped to oracle tests) → **isolates build quality.** Use for L1–L4 capability scoring. The criteria format *is* the test plan: each "(n) …" line maps to one weighted test group.
- **Thin prompt** (operator-style intent: *"build me a basic CRM"*) → **measures the engine's `/groom` + ambiguity-resolution + decide-and-document** — a core value of *this* engine (it turns vague intent into shipped, gated features). Scored on **process** (did it decompose sanely? tier correctly? escalate the truly-undecidable bits?) and on whether the resulting build still clears a *baseline* slice of the thick oracle.
Key L3/L4 concepts ship as **both a thick and a thin twin**, so we can separate "can it build" from "can it figure out what to build."

---

## 6. The engine-effect protocol (how a change gets verified)
1. **Pin the model** (set it explicitly per agent via policy) so the delta is the *engine's*, not the model's.
2. Run the relevant tier(s) **before** the change → baseline (N≥5 seeds for L3+, to get pass^k + variance).
3. Make the change. Run again. **`bench/run.mjs --compare`** the deltas.
4. **Decision rule:** a quality regression (oracle score ↓ or pass^k ↓) **vetoes** the change regardless of token/speed wins. A token/cost/latency win with quality held is a real improvement. A change that moves *no* measured number (and isn't a pure correctness fix) is churn. *(This rule is already wired into `/kaizen`.)*
5. **Report variance, not point estimates** for L3+ (model nondeterminism makes single runs noisy — the harness already warns <~10% deltas are noise).

---

## 6.5 Statistical reality — what the numbers can and can't tell us (added after adversarial review)
The honest limit of an end-to-end agent benchmark: **a full `/work` run is noisy** (nondeterministic explorers/builders, retries), and binomial confidence intervals at small N are wide — at N=5, p̂=0.5 the 95% CI is roughly [0.06, 0.94]; detecting a 10-point *continuous* improvement (40%→50%) with power needs N in the hundreds, which is unaffordable at $2–30/run. **So we do NOT claim to detect small continuous gains end-to-end.** What this suite *can* reliably detect, and how:

- **Categorical quality regressions (✓→✗ on a gating criterion, or a task that resolved now fails):** detectable at small N — a gate that was green going red is a hard, low-variance signal. **This is the primary engine-effect guardrail.**
- **Large cost/token/latency shifts:** the deterministic, cheap tiers (L0–L1 + the existing context-tax measurement) run at high N for ~free, so *small* token/context deltas (e.g. the ~$0.0094/call context tax) are measured *there*, precisely — **not** on the expensive L4/L5 runs.
- **Reliability collapses:** pass^k over k≥5 catches "works once, flaky at k=8" — reported with its CI, never as a point estimate.

**Rule:** match the signal to the tier. Cheap-precise (token/context/quality-regression) → L0–L1 high-N. Expensive-coarse (did the engine still build the CRM, did a gate break) → L3–L5 low-N, reporting CIs and treating sub-CI deltas as noise. The decision rule (§6) keys on **categorical regressions**, not fragile continuous deltas.

### What this benchmark CANNOT measure (state it so nobody over-reads a number)
- **Small engine deltas end-to-end** (below the loop's noise floor at affordable N) — measure those on the cheap deterministic tiers instead.
- **Model-quality changes** — that's not engine-effect; the model is pinned precisely to exclude it.
- **Real-world long-horizon behavior** — we score isolated single tasks; a 20-feature roadmap with drift is a different beast.
- **Code maintainability / UX / aesthetics** — objective oracles don't capture these (and per the operator's own ruling, that's acceptable *if* output/tokens/speed are measured).
- **Security beyond the abuse tests we wrote** — *no known attack succeeded* ≠ *secure*. A green security gate means "survived our red-team set," nothing more.
- **A "good build" in the human sense** — passing the oracle ≠ a senior would accept it. Mitigation: keep a **human gold-reference score** (a human builds the reference; note what % the oracle gives it) so we know whether a low agent score means "task hard" or "oracle too strict."

## 7. Execution & anti-cheat (the practical mechanics)
- **Isolation:** Docker-per-task (Commit0/Terminal-Bench), parallel workers, per-task timeout (Commit0 default 1800s). The agent works in a sandboxed clone; **the `oracle/` is mounted read-only and only after the agent stops.** **Each task runs in a FRESH agent session** (no shared backlog/context across tasks — otherwise one task's state leaks into the next and the numbers are meaningless).
- **Reproducibility over time (or the suite rots):** every task env **pins versions** — base image digest, Node/Python/SQLite versions, `TZ=UTC`, locale, and a committed lockfile — because SQLite `datetime('now')`/row-order, Node minor bumps, and Windows CRLF will silently flake an oracle. A task is "green" only if its oracle gives the **same** score on the reference solution locally and in CI.
- **Flaky detection (mandatory before trusting a task):** run each oracle **≥10× on its reference solution**; any nondeterministic assertion (timing, ordering, random fixtures) is a bug in the oracle, not a property of the agent — fix or remove it.
- **Anti-cheat (mandatory, from the ABC findings):** (1) oracle tests never in agent-writable space; (2) verify the agent didn't modify the test runner / lockfile / CI; (3) include trap/negative tasks; (4) periodically mutation-test the oracle itself.
- **Cadence by cost** (we have lots of tokens but not infinite): **L0–L1 every change/CI · L2–L3 nightly · L4–L5 weekly / pre-release / on-demand.** A full L4/L5 pass is dollars and tens of minutes — run it deliberately, not on every commit.

---

## 8. Build vs adopt (don't reinvent what's already vetted)
- **Adopt:** SWE-bench Verified slice (L2), Aider polyglot exercises (L1), the **MCP conformance suite + Inspector CLI** (L3 MCP oracle), Terminal-Bench's harness/quadruple *pattern*.
- **Author (original, contamination-free, engine-specific):** the L3 MCP/library tasks, the L4 CRM, the L5 concurrency/security/**trap** tasks, and all **process oracles** (engine-behavior flags). These don't exist elsewhere and are where our differentiation is measured.

---

## 9. Failure modes we WILL hit (and the mitigation)
| Risk | Mitigation |
|---|---|
| Oracle coverage gaps → false positives (the SWE-bench 15.7% problem) | adversarial test augmentation + the pass-on-solution/fail-on-broken admission gate + mutation-testing the oracle |
| The agent cheats (overwrites tests, empty-response) | tests outside writable space, injected post-run; tamper check; trap tasks where do-nothing fails |
| Nondeterminism → noisy single runs | pass^k over N seeds; report variance; treat <10% deltas as noise |
| Contamination (SWE-bench in training data) | use adopted suites only for engine-effect (model pinned); author novel tasks; date-window |
| Capability/engine confound | pin the model for engine-effect runs |
| Cost blowout | strict cadence-by-tier; L4/L5 are weekly/on-demand, not per-commit |
| LLM-judge creep | banned for scoring; objective oracle required for admission |

---

## 10. Proposed phased build (for your approval — this doc is the plan, not the build)
**The crux, stated plainly (adversarial-review honesty):** the hard, expensive part of this whole effort is **authoring sound oracles + reference solutions**, not running them. A real L4 CRM oracle is itself a full CRM build (the reference solution) **plus** ~50+ acceptance tests **plus** the validity-gate debugging — realistically **days of careful work per L4 task**, not hours, and an ongoing maintenance cost every time the oracle changes. Two rules that follow: (a) **no tier's numbers are trusted until its oracle has passed the §4 validity gates AND been run ≥10× on the reference to prove it isn't flaky**; (b) to avoid baking one person's blind spots into both sides, the **oracle author and the reference-solution author should be independent** (or cross-checked), because a reference written by the oracle's author can share its gaps.

- **Phase 1 — PROVE THE MACHINERY ON ONE ORACLE before scaling.** Build the L3 **MCP-server** task end-to-end (it has the cheapest, most-real oracle: the official conformance suite + inspector CLI) + 2–3 L1 modules. Run the validity gates + the 10× flaky-check. *If this one oracle survives, the plan's strategy is validated; if it doesn't, we learn what's wrong before sinking days into the CRM.* Don't route around the hard part — go through it once, small.
- **Phase 2:** the L4 **CRM** task (thick + thin twin) with the injected acceptance suite + the authoring validity gates. *The flagship "build me a CRM" benchmark.*
- **Phase 3:** adopt a SWE-bench Verified slice (L2) — **needs Docker** (operator/infra).
- **Phase 4:** L5 trap + security(abuse) + concurrency + pass^k reliability harness.
- **Phase 5:** the engine-effect protocol wired into CI/Routines with model-pinning.

### What this needs from you (access/infra)
- **Docker** + disk + time → L2 (SWE-bench) and per-task isolation for L3–L5.
- An **`ANTHROPIC_API_KEY`** → hermetic, reproducible bench runs in CI (`--bare`).
- **Node + the MCP CLIs** (`@modelcontextprotocol/conformance`, `@modelcontextprotocol/inspector`) → the L3 MCP oracle (npx-installable, no special access).
- **Budget sign-off** for the L4/L5 cadence (each full pass is real dollars on the Agent SDK credit pool).
- A call on **how many seeds** for pass^k (cost ∝ k).

---

## 11. Sources (verified against active repos, 2026-06-15)
- **ABC — Establishing Best Practices for Building Rigorous Agentic Benchmarks** (arXiv 2507.02825; Liang, Stoica, Zaharia, Steinhardt, Kang, Kapoor et al.) — the dual-validity framework + the 100%-distortion / cheating findings.
- **SWE-bench / SWE-bench Verified** — github.com/SWE-bench/SWE-bench, swebench.com/verified.html, openai.com/index/introducing-swe-bench-verified (FAIL_TO_PASS/PASS_TO_PASS, Docker-per-instance).
- **UTBoost** (arXiv 2506.09289) — 15.7% false positives / 24–41% ranking changes from thin oracles.
- **SWE-Lancer** (arXiv 2502.12115; github.com/openai/SWELancer-Benchmark) — triple-verified E2E acceptance tests; payout-weighted difficulty; the `assert 1==1` cheat.
- **Commit0** (arXiv 2412.01769; github.com/commit-0/commit0) — build-a-library-to-pass-its-suite; Docker/Modal/timeout/coverage execution model.
- **Terminal-Bench 2.0** (tbench.ai; github.com/laude-institute/terminal-bench) — the four-component task quadruple; medium/hard laddering; ~84% frontier.
- **tau-bench / τ²-bench** (arXiv 2406.12045, 2506.07982; github.com/sierra-research/tau2-bench) — state-hash reward; **pass^k**; compositional task generator; dual-control hard tier.
- **Aider polyglot** (aider.chat/2024/12/21/polyglot.html; github.com/Aider-AI/polyglot-benchmark) — empirical difficulty re-calibration (≤3-of-7-models band → 5–50% score range).
- **MCP conformance + Inspector** — github.com/modelcontextprotocol/conformance (CLI, exit 0/1, checks.json), github.com/modelcontextprotocol/inspector (`--cli --method tools/call`).
- **METR time-horizon / AppWorld** (metr.org, appworld.dev) — long-horizon + stateful-app references for L5.
