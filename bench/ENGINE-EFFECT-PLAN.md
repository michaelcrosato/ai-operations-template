# Engine-Effect Comparison — scope & design

*2026-06-16 · scoping the README's named "next big step": prove, with the model pinned, that the
engine's loop produces a better / cheaper / more reliable build than a bare model. Grounded in
`testing-suite-plan.md` §1 (two axes) + §6.5 (statistical reality) and `bench/HARNESS-RESEARCH.md`.*

## 1. The question (and the trap)
*Does the `ai-operations` engine make a build better — and is that the engine, or just the model?*
The only honest way to answer is to **pin the model and vary the harness** (Artificial Analysis Coding
Agent Index holds the model constant and varies the harness; "Stop Comparing LLM Agents Without
Disclosing the Harness", arXiv 2605.23950, shows the *same* model swings ~9.5 pts on SWE-bench Pro
from harness alone). So every arm below runs the **same pinned model** on the **same oracle-scored
task**; the only thing that changes is how much of the engine is layered on.

## 2. The arms — each isolates ONE dimension of "the engine"
The engine's value is NOT one thing; it's a stack. Conflating them is the design error to avoid.

| Arm | What it adds over the bare model | Isolates | Status |
|---|---|---|---|
| **A0 — baseline** | nothing: `claude -p` + file tools, one shot, in an isolated tmpdir | the model alone | ✅ exists (`run-suite --ctx clean`) |
| **A1 — context** | the engine's distilled build *discipline* injected via `--append-system-prompt` | the **instruction** layer | ✅ this PR (`run-suite --ctx engine`) |
| **A2 — gate-retry** | run a deterministic gate after the build; on fail, feed the failure back and retry (bounded) | the **verify→retry** loop | ◻ Phase C |
| **A3 — review-fix** | a fresh-context independent evaluator critiques the build vs the spec; a fix pass remediates | the engine's **signature** adversarial-review loop | ◻ Phase C (highest value) |
| **A4 — full loop** | tiering + builder/evaluator/security-reviewer + evidence gate (the real `/work` loop) | the **whole engine** | ◻ Phase D |

A1 is deliberately a *distilled* discipline prompt (`bench/suite/lib/engine-context.md`), **not** the
raw `builder.md`/`CLAUDE.md`: those are full of repo-process plumbing (features.json, feat/ branches,
evidence dirs) that is irrelevant to a temp-dir build and would *handicap* the engine arm with
confounding noise. A1 tests the engine's transferable instructions; A2–A4 test the loop.

## 3. Methodology
- **Model pinned** across arms (per task `meta.budget.model`). A model change is not an engine effect.
- **Isolation:** every arm runs in a fresh `os.tmpdir` workdir (no repo `.claude/`/`CLAUDE.md`
  auto-load). Whatever ambient context exists loads for *all* arms equally, so the only delta is the
  arm's added layer (for A1, the injected prompt). *(This is why A1 does not need `--bare`.)*
- **Same oracle** scores every arm — the oracle is hidden from the agent, so no arm can "retry until
  the oracle passes"; A2/A3 may only use signals the engine itself would have (its own gate, an
  independent reviewer reading the task spec).
- **Reliability:** `pass^k` over N seeds (`--repeat N`), reporting the per-arm pass-rate + score/cost/
  turn spread and the **delta** between arms.

## 4. Statistical reality — what this can and cannot show (testing-suite-plan §6.5)
This is the part most "our framework is X% better" claims get wrong:
- A full agent build is **noisy**; binomial CIs at affordable N are wide (N=5, p̂=0.5 → 95% CI ≈
  [0.06, 0.94]). Detecting a small **continuous** lift (e.g. 0.90→0.95) end-to-end needs N in the
  hundreds at $0.10–$30/run — **unaffordable. We do not claim to detect small continuous gains.**
- The reliable signal is **categorical**: a task that *resolved* now *fails*, or a gating criterion
  that was green goes red (or vice-versa for an improvement). Low-variance, detectable at small N.
- **Ceiling problem (today):** every current task scores ~1.0 at baseline (A0) — there is **no
  headroom** for A1–A4 to show a lift. So the engine effect can only appear on a task where the
  **bare baseline categorically FAILS** in a way the engine's loop catches. *This makes a
  "headroom task" a prerequisite for a meaningful A2–A4 result, not an afterthought (Phase B).*

## 5. Validity threats → mitigations
| Threat | Mitigation |
|---|---|
| Capability/engine confound | model pinned across arms (§3) |
| Ambient-context confound | identical isolated tmpdir for all arms; only the arm's layer differs |
| A1 = "just a better prompt", curated by us | the injected text is version-controlled + inspectable (`engine-context.md`), labelled a distillation; A2–A4 test the loop, not a prompt |
| Ceiling effect (no headroom) | Phase B headroom task; treat A1 deltas on saturated tasks as noise, not signal |
| Nondeterminism / small-N noise | `pass^k` over seeds; report CIs; key the decision on **categorical** flips, not sub-CI deltas |
| Oracle leakage to A2/A3 | the oracle is never shown to any arm; A2/A3 use only the task spec + the engine's own gate |
| Contamination (for any adopted SWE-bench tasks) | engine-effect only (model pinned), not a capability claim; date-window |

## 6. Phased plan
- **Phase A (this PR): the experimental harness + the A1 context arm.** `--ctx engine` now injects
  `engine-context.md` via `--append-system-prompt`; both arms run isolated in tmpdir. A manual A/B is
  `run-suite <task> --ctx clean --repeat N` vs `--ctx engine --repeat N`. *Follow-up (small):* a
  `--compare` flag that runs both arms and prints the delta table in one shot.
- **Phase B: a headroom task.** Author a task whose **bare baseline categorically fails** but a
  disciplined/reviewed build passes — e.g. a spec with a subtle but stated security/edge requirement a
  one-shot reliably misses (the L4-broken-RBAC class), so A3's review catches it. Without this, A2–A4
  have nothing to measure.
- **Phase C: A2 gate-retry + A3 review-fix** (the signature engine value). A3 = after the build, a
  fresh `claude -p` evaluator reads the task spec + the produced artifact and lists concrete defects;
  a fix pass remediates; the oracle then scores. Measures whether review-fix lifts the categorical
  pass-rate vs one-shot. (3× the calls of A0 — report cost honestly.)
- **Phase D: A4 full `/work` loop** + wire the engine-effect protocol into a Routine with model
  pinning (testing-suite-plan §6, §11 Phase 5). Largest lift; do last.

## 7. What this PR delivers
The harness + the A1 arm (Phase A core): `--ctx engine` is now a real, isolated, inspectable context
arm (was a no-op workdir toggle). It establishes the model-pinned isolation + the injected-context
mechanism every later arm reuses. The honest expectation per §4: **A1 shows ~no delta on today's
saturated tasks** — the engine effect lives in A3/A4 on a Phase-B headroom task. That sequencing (not
a premature "we're X% better" number) is the point of scoping this properly.

## 8. First-attempt findings (2026-06-16) — Phase B+C built; the baseline is already at the ceiling
Phase B (a headroom task) and Phase C (the A0-vs-A3 harness) are built. The first rigorous run gave a clear — if humbling — empirical result, reported honestly:

- **`H1-notes-ownership`** (the object-ownership / IDOR crux, ownership as a gating group) is **validity-gated** (reference 1.0; an IDOR build → gated 0; over-block caught). But the **headroom check failed**: a bare one-shot baseline scored **3/3 = 1.0 with sonnet AND 3/3 = 1.0 with haiku** (the weak-baseline amplifier). Both models reliably implement a *clearly-stated* ownership rule one-shot — even though every worked example acted as the owner.
- **The real finding:** the "stated-rule-omission" hypothesis is wrong for current models on a small, clearly-specified task — they don't drop stated requirements, so that failure mode yields **no headroom**, and a weaker pinned model doesn't change it. A genuine headroom task must instead target a **hard correctness goal models reliably get wrong** — cross-call idempotency, a subtle stateful invariant, a spec that fights a strong prior, or a larger multi-file task where mistakes compound — with a more complex (still deterministic) oracle. That is real research, not a quick task tweak.
- **Phase C harness (`run-effect.mjs`) works end-to-end** (paired build → A0-score → independent spec-review → fix → A3-score; model pinned via `--model`). Validating it caught and fixed a real pass-evaluation bug (`score` vs `oracle_score`). On H1 (ceiling) it correctly reports **A0 2/2, A3 2/2, 0 flips, "A0 at ceiling — no signal possible."** Ready to run the moment a true headroom task exists.
- **Honest status:** the engine-effect **mechanism is built and proven**; the **signal is not yet obtainable** because the models are already at the ceiling on H1. We deliberately did NOT manufacture a number by hunting tasks until one failed. Next (Phase B'): design a hard-correctness headroom task per §4, then point `run-effect.mjs` at it.
