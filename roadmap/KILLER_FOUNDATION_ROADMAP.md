# Killer Foundation Roadmap: Less is More

*Research deliverable · 2026-07-01 · method: 56-agent deep-research sweep (6 repo-audit + 7 web-research agents → adversarial hype-vs-proven verification → synthesis), then a hand ground-truth pass that corrected the audit before anything was written here.*

## 0. How to read this
The goal was a "killer foundation": modular, built-by-AI-for-AI, lean, on the current best-practice frontier. The honest headline: **this repo is already the right shape and already lean.** The frontier consensus of 2026 (Anthropic engineering, Cognition/Devin postmortems, the context-rot studies) endorses exactly what already exists here — single-writer builder, fresh-context judge, evidence-gated state, fail-closed hooks, binary PASS/NEEDS_WORK grading. So the leverage is **not** a big rebuild. It is a small number of careful de-duplications and one guardrail hardening — plus resisting the temptation to over-engineer a foundation that is working.

**A word on rigor:** the machine audit (run on a fast model) overstated several "free prunes." A ground-truth pass caught them before they were written up. Those corrections are kept visible below as the clearest possible demonstration of this repo's own ethos — *trust nothing without evidence.*

## 1. TL;DR
- **The foundation is sound; the work is subtraction and de-duplication, not addition.** ~6 genuine items, most Small/Medium effort.
- **Highest-leverage real change:** unify the two independent copies of the glob/path-match logic (bash in `verify-gate.sh` + node in `path-guard.js`) into one shared utility. It is the #1 drift risk on the load-bearing guard. (R1)
- **The one guardrail to harden, never soften:** verifier-gaming is the dominant real failure mode of capable agents. Keep the assertion-shield strict and make the gate resistant to untracked test files surviving a reset. (R3)
- **Context discipline is a correctness lever, not just cost:** every frontier model (incl. Opus 4.8) measurably degrades as context fills — degradation starts well below the window limit. Keep sessions short, one-feature-at-a-time, context isolated. This repo already does this; protect it.
- **What we are NOT doing:** aggressive deletion (the "cruft" is already untracked+gitignored), 1000-agent swarms, parallel writers, LLM-judge numeric scoring, an `@CLAUDE.md` rewrite of AGENTS.md, or auto-generated context files. All are hype or regressions for a one-operator factory.

## 2. Ground-truth corrections to the machine audit
| Audited as | Reality (verified) | Verdict |
|---|---|---|
| Delete tracked `.agents/` mirror (~100K) | Untracked, gitignored (`.gitignore:46`), 36K; documented deliberate local cross-CLI cruft (DECISIONS 2026-06-11/13) | **No repo action.** Optional local `rm`. |
| Untrack `tmp/` (284M) | Already untracked (`git ls-files tmp` = 0), gitignored (`.gitignore:17`) | **No repo action.** Optional local `rm` to reclaim disk. |
| `tmp-feedback-2.md` "committed" | Not tracked, gitignored (`.gitignore:41`) | **No repo action.** |
| Delete Opus-4.7 thinking-budget knobs | `model-policy.json` already uses the `effort` dial (`high`/`medium`); no budget knobs exist | **Already done.** |
| Add `AGENTS.md` via `@CLAUDE.md` import | AGENTS.md is a deliberate thin human-readable pointer; `@`-import is Claude-only syntax non-Claude tools can't parse | **Current shape is better.** Skip. |

Net: three of the audit's "free wins" were already handled, and one was a regression. The genuine backlog is below.

## 3. The roadmap (re-prioritized, verified)
Ordered by leverage-per-effort. Tiers per `TASK_AUTONOMY_TRIAGE.md`.

| id | title | type | what & why | evidence | lev | eff | risk | gating |
|----|-------|------|-----------|----------|-----|-----|------|--------|
| **R1** | Unify glob/path-match into one shared utility | REFACTOR | The F-0034 sentinel algorithm + F-0042 Windows normalization live twice — bash `verify-gate.sh` and node `path-guard.js`. They *will* drift, and both gate the same authorization. Extract one shared matcher, consume in both. | `verify-gate.sh`, `.claude/hooks/path-guard.js` (guardrails audit: "significant duplication") | High | M | Med | /work **Tier C** — security-reviewer mandatory (hooks) |
| **R2** | Delete the never-run bash fallback matcher | DELETE | `verify-gate.sh`'s sed/bash glob fallback is dead: preflight guarantees node, and no-node already fails closed (exit 2). ~20 brittle lines + its contract test. Folds into R1. | `verify-gate.sh` fallback branch; `local-cli-preflight.sh` | Med | S | Low | with R1; Tier C review |
| **R3** | Harden the gate against untracked-test-file survival | REFACTOR | Verifier-gaming (dropping a test-hook file that survives reset and rewrites outcomes) is the #1 real agent failure mode. Make `verify.sh` clean/ignore untracked test files before the gate runs. Keep assertion-shield strict on ANY assertion weakening. | `scripts/verify.sh`; assertion-shield · [arxiv 2606.26300] | High | M | Low | /work **Tier C** — security-reviewer mandatory |
| **R4** | Modularize `test-hooks.sh` (1685 L) | REFACTOR | One 1685-line file recreates fixtures ~8×. Extract a `test-lib.sh` (fixture factories) + one file per contract + thin runner. Same coverage, far less to load/read. Evaluator must confirm the test count is unchanged. | `scripts/test-hooks.sh` | Med | M | Med | /work Tier B |
| **R5** | Surgical doctrine de-duplication | SIMPLIFY | The session loop is described at full detail in BOTH `CLAUDE.md §3` and `AI_OPERATIONS_PLAN.md §5.1`. Make one canonical, the other a pointer. Do NOT collapse README/OPERATOR_GUIDE — they serve different readers (product / operator). Small, careful token win. | CLAUDE.md §3; PLAN §5.1 · [context-rot], [arxiv 2602.11988] | Med | S | Low | /work Tier A; CLAUDE.md §9 checklist |
| **R6** | Trim `OPERATOR_GUIDE.md` overlap | SIMPLIFY | 79 lines re-extract PLAN §8. Keep the operator-facing cheat sheet (surfaces, morning/evening checklist, kill switches) and point to PLAN §8 for the full model. Preserve plain-English accessibility (§8). | OPERATOR_GUIDE.md vs PLAN §8 | Med | S | Low | /work Tier A |
| **R7** | Split product roadmap from engine backlog | SIMPLIFY | `ROADMAP.md` conflates engine maintenance with the shipped one-shot product (`src/oneshot/`). A thin product view clarifies the open Q-0003 fork. | ROADMAP.md; docs/bounded-vs-afk-strategy.md | Med | S | Low | **operator sign-off** (Q-0003 is operator-reserved) |
| **R8** | Retire `bench/` scaffolding when modernized | DELETE | 77 files of self-contained fixtures; `bench/README.md` already recommends promptfoo/Inspect AI. Inert today (`docs/optional-modules.md`). Swap only when a builder is ready. | bench/ (77 files) | Med | L | Med | future /kaizen; Tier B |

## 4. What we are deliberately NOT doing
- **Aggressive "pruning."** The flagged cruft (`.agents/`, `tmp/`, `tmp-feedback-2.md`) is already untracked + gitignored. Deleting it is optional local disk hygiene with zero repo effect. Do not manufacture prune work.
- **Native dynamic workflows / 1000-subagent swarms** (killed, 3/3 refutes). A one-operator, one-feature-at-a-time factory has nothing to swarm. Bias every change toward *less* orchestration.
- **A second parallel builder or builder-spawned sub-agents.** Cognition's durable rule: multi-agent works only when writes stay single-threaded and extra agents *advise*. The repo already forbids this — keep it.
- **LLM-judge numeric scoring / pairwise ranking** (RAND: no judge is uniformly reliable; verdicts flip on formatting). Keep the evaluator a binary PASS/NEEDS_WORK bound to concrete acceptance, retry-once-then-block. Do not widen judge scope.
- **Auto-generating any agent context file** (`/init` on CLAUDE.md/AGENTS.md). LLM-written context files measurably *reduce* success (−0.5–2%) and inflate cost (+20–23%). Hand-write minimal only; a duplicative-line *deletion* counts as a valid /kaizen win.
- **Rewriting AGENTS.md as an `@`-import.** Claude-only syntax; the current human-readable pointer is the better cross-tool shape.
- **Retrieval indexes / feature over-decomposition / heavy hand-holding prompts.** Opus 4.8's larger window + better compaction make these obsolete — but respect the real context-rot ceiling: shrink context, don't just trust a bigger window.

## 5. Sequencing (agile, 3 waves)
- **Wave 1 — Guard integrity (Tier C, security-reviewed):** R1 → R2 (unify then delete the dead fallback), then R3 (untracked-test-file hardening). The single highest-leverage cluster; each gets the fresh evaluator **and** the mandatory security-reviewer (hooks/gate = sensitive path).
- **Wave 2 — Readability (Tier A/B):** R4 (test-hooks modularization), R5 + R6 (surgical doc de-dup). Free evaluator; CLAUDE.md §9 checklist for R5.
- **Wave 3 — Product clarity & deferred (operator-gated):** R7 (after the operator answers Q-0003), then R8 as a /kaizen item when a replacement eval harness is ready. Not urgent.

Optional, anytime: local disk hygiene (`rm -rf tmp/ .agents/` reclaims ~320M locally; no repo effect).

## 6. Verification note (honesty)
During the research, a batch of adversarial-verification votes hit **server-side rate limiting**, so several external claims "survived" without a full 3-vote refutation. All such claims *endorse keeping the existing design* (single-writer, fresh-context judge, strict assertion-shield) — they drive conservative, status-quo actions, not risky new ones. The one change they motivate (R3) is Tier-C and gets a mandatory security review at build time regardless. The load-bearing model/tooling facts (Opus 4.8, the `effort` dial) were sourced fresh today against primary docs, satisfying the P1 freshness rule.

## 7. Sources
- Context rot (all frontier models degrade with length): https://www.trychroma.com/research/context-rot · https://redis.io/blog/context-rot/
- LLM-written context files hurt success/cost: https://arxiv.org/html/2602.11988v1 · https://www.infoq.com/news/2026/03/agents-context-file-value-review/
- Verifier-gaming as dominant failure mode: https://arxiv.org/html/2606.26300
- LLM-judge unreliability (RAND, Mar 2026): https://arxiv.org/abs/2603.05399
- Single-writer multi-agent rule (Cognition): https://cognition.com/blog/dont-build-multi-agents · https://cognition.com/blog/multi-agents-working
- Fresh-context reviewer pays (Anthropic): https://www.anthropic.com/engineering/multi-agent-research-system
- Effective context engineering (Anthropic): https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Opus 4.8 / effort dial (primary docs): https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8 · https://platform.claude.com/docs/en/build-with-claude/effort
- AGENTS.md standard: https://agents.md · https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
