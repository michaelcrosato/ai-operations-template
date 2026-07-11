# How this repo proves it works — and how to check it yourself

This is a 100% AI-coded "factory": agents write every line, and a human only plans and does final QA. So "it works" can't be a vibe — it has to be *provable, on your own machine, in minutes*. This page is both the explanation (what each proof means) and the tutorial (the exact commands to run and what you'll see).

There are three independent, runnable proofs, plus evidence captured on disk:

1. **The gate** (`verify.sh`) — everything is green: types, style, tests, state integrity, guard behavior.
2. **The non-vacuousness check** (`mutation-smoke`) — the safety tests actually have teeth: break the code and a test fails.
3. **The benchmark** (`bench/`) — real, measured output quality, tokens, cost, and speed.

## Prove it in three commands

```bash
bash scripts/init.sh        # one-time: install dev dependencies
bash scripts/verify.sh      # the full gate — ends with: VERIFY: PASS (exit 0)
node bench/micro.mjs        # the free, local, no-API benchmark (~1s)
```

If `verify.sh` prints `VERIFY: PASS (exit 0)`, every layer below passed. CI re-runs the *exact same* command on every pull request, so a local green is a mergeable green.

---

## 1. The gate — `scripts/verify.sh`

One command that must pass before anything merges. It runs, in order and fail-fast:

- **typecheck** (`tsc --noEmit`) and **lint** (biome)
- **unit tests** (`node --test`)
- **test-coverage guard** — every `*.test.*` file must be wired into the `npm test` script by name; a test file that exists only in git (never actually run) *fails the gate*. No silent dead tests.
- **state integrity** — `update-state.ts --validate` checks `features.json` against its schema and invariants (single in-progress, born-failing, evidence-gated `passes`, closed shape)
- **model-policy drift** — agent card `model:` frontmatter must match `.claude/model-policy.json`
- **assertion-shield** — blocks any commit that deletes/weakens a test assertion
- **biome + ShellCheck v0.11.0** on `scripts/` and `.claude/hooks/` (official binary, archive and binary checksums pinned)
- **hook-contract tests** — `hook contract tests: 464 passed, 0 failed`
- **mutation-smoke** — see §2

Run it: `bash scripts/verify.sh`. The last line is `VERIFY: PASS (exit 0)` or `VERIFY: FAIL`. That line is machine-read: a feature can only be marked "done" when a captured green log exists on disk (see §5).

---

## 2. Why the tests aren't vacuous — `scripts/mutation-smoke.sh`

A test that passes even when the code is broken proves nothing. Mutation-smoke defends against exactly that: it **deliberately breaks a load-bearing invariant in-tree, one at a time, and requires a test to catch (kill) it.** A *surviving* mutant = a vacuous test = gate failure. It also self-tests its own detector (a hermetic case it *should* report as survived) and restores every file byte-for-byte afterward, so it's safe to run mid-work.

Run it: `bash scripts/mutation-smoke.sh`. Real output:

```
── mutation smoke: do the safety-critical tests actually constrain behavior? ──
  [killed]   update-state: Tier-C done-gate removed
  [killed]   update-state: single-in_progress invariant removed
  [killed]   update-state: --add born-status pending guard removed
  [killed]   update-state: awaiting_approval-requires-evidence removed
  [killed]   assertion-shield: deletion-detection gate removed
── mutation smoke: OK (every known mutant was killed by a test) ──
```

Each `[killed]` line is a guard proving it has teeth: remove that rule from the code, and a specific test fails. This is what makes "the guards work" an objective statement.

---

## 3. The guard tests — `scripts/test-hooks.sh` (464 checks)

Deterministic abuse cases against every hook — positive *and* negative:

- **guard-bash**: blocks direct push to `main`/`master`, force-push, `.env` reads (bash *and* PowerShell / `[System.IO.File]` / `xxd`/`base64` tricks), pipe-to-shell, `npm publish`, secret-exfil POSTs, recursive `rm` on root/home, and self-bypass of the assertion-shield — while *allowing* pushes to short-lived feature/fix branches, scoped `rm`, and harmless git.
- **verify-gate / path-guard**: blocks every spelling of a `features.json` edit (relative, backslash, dot-segment, `//`, parent re-entry); enforces per-feature path authorization (in-scope allowed, out-of-scope + `forbidden_paths` blocked, fail-closed on unknown feature); Windows absolute-path normalization (the F-0042 fix); and agrees between the bash and node implementations.
- **update-state**: rejects malformed JSON, `passes:true` at birth, dangling dependencies, and two concurrent in-progress features (hand-edit defense).
- **kill switch**: an `AGENT_STOP` file halts all commands.

These run inside `verify.sh`; the count prints as `hook contract tests: 464 passed, 0 failed`.

---

## 4. The benchmark — `bench/`

Measures *real* output quality (deterministic graders — exact-match, set-match, regex, code execution, schema conformance), token consumption, cost, and speed — for the base model and for the factory's loaded "engine context" (the token tax of `CLAUDE.md` + hooks).

**Levels:** L0 = 7 atomic micro-probes (extract, summarize, RBAC-reason, codegen, injection-resist, judge) with a live baseline; L1–L4 = capability builds with real oracles (a spec'd module, an MCP server, a CRM API); G-tier = an engine-effect gauntlet (strict-JSON discipline, long-context trace, DAG pipeline, circuit-breaker).

**Run it:**

```bash
node bench/micro.mjs                              # free, local, ~1s (gate latency)
node bench/run.mjs --dry-run                      # validate + print commands (free)
node bench/run.mjs --ctx clean                    # L0 suite, clean sandbox  (bills the Agent SDK)
node bench/run.mjs --ctx engine                   # L0 suite, from repo root (context tax)
node bench/suite/run-suite.mjs L3-mcp-calc-search # one capability build     (bills the Agent SDK)
```

> The `run.mjs` / `run-suite.mjs` paths call the `claude` CLI and **cost real credits/subscription usage** (~$0.45–0.52 for the L0 set). `micro.mjs` and `--dry-run` are free.

**Reading the output** (real records from `bench/results/*.jsonl`, one JSON per line):

- **L0 task:** `{ "task": "...", "model": "sonnet", "pass": true, "in_tokens": 3, "out_tokens": 74, "cost_usd": 0.069 }` — `pass` is the deterministic grader's verdict.
- **Suite task:** `{ "task": "G1-strict-json", "oracle_score": 1, "dq": false, "gated_fail": [], "iterations": 3, "out_tokens": 3623, "cost_usd": 0.178 }` — `oracle_score ∈ [0,1]`; `dq:true` means a *gating* criterion failed (auto-disqualify); `gated_fail` names which.
- **Context-tax read:** L0 clean ≈ 7/7 pass, ~1028 out-tokens, ~$0.45 vs engine ≈ 7/7, ~993 tokens, ~$0.52 → the loaded engine context costs roughly a cent per agent call with flat quality on these tasks. That's overhead to shrink, not a regression.

**Why the oracles are trustworthy:** G1–G4 score `1.0` on the reference solution and `0` on a deliberately sabotaged one — so a passing score means the oracle actually discriminates good from broken, rather than rubber-stamping.

---

## 5. Where the proof lives on disk

Nothing here is self-reported; the receipts are committed:

- `roadmap/evidence/F-XXXX/verify.log` — a captured `VERIFY: PASS (exit 0)` log per shipped feature. A feature is "done" *because* this green log exists, not because an agent said so.
- `bench/results/*.jsonl` — every benchmark run, appended one record per line.
- `roadmap/metrics.jsonl` — one line per shipped feature (tier, which builder, evaluator verdict, PR number).
- `roadmap/PROGRESS.md` / `roadmap/DECISIONS.md` — the narrative and every judgment call.

---

## Honest limitations — what these proofs do *not* yet show

- **The benchmark is not wired into CI.** Nothing in `bench/` runs automatically today — it's a measurement tool you run by hand, not a merge blocker. Wiring a nightly run (and gating the free `micro.mjs` latency probe) is future work.
- **Engine-effect signal is ceiling-bound.** On greenfield tasks the base model already scores ~1.0, leaving no headroom to *measure* the factory's build→verify→judge loop improving outcomes. A fresh fix-and-improve-existing-code task is queued in the roadmap; the earlier experimental branch was rejected during review and is not evidence.
- **The LLM-judge lane is deferred.** `tests/judges/` holds planted-bug diffs (a weakened assertion, a seeded IDOR) that the evaluator and security-reviewer *should* catch — but they are **not run in the gate** (an advisory promptfoo lane; LLM checks are slow, flaky, and billed). The judge prompts are exercised in real feature reviews, not in CI.
- **App-level tests** (`src/oneshot/`, `src/health.js`) cover happy-path + error cases, not fuzzing.

**Bottom line:** the core — the gate, the non-vacuousness proof, and the guard tests — is real and you can reproduce it in a couple of minutes. The benchmark produces real numbers today; its engine-effect and LLM-judge lanes are honest works-in-progress.
