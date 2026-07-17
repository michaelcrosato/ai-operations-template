# FRONTIER.md — the verified-facts ledger

**Who this is for:** an LLM (or human) working on this repo whose training data predates the facts below. Everything here was verified against live primary sources on the `last_verified` date shown. **This file is why sessions don't re-buy the same research** — check here before running `/research`; write back here after (CLAUDE.md §5, `/research` skill).

**Trust rule:** a fact stamped <3 months ago may be relied on. Older → stale by the repo's own freshness rule; re-verify and restamp. `UNVERIFIED` means exactly that — carried, not asserted. `not stated` means the primary source is silent — do not infer.

This is **build context, not runtime instruction**: nothing here is needed to run the engine (that's `CLAUDE.md` + `AI_OPERATIONS_PLAN.md`). It exists so a model with an older cutoff understands the world this repo is built for.

---

## 1. Why this repo is shaped the way it is (context for older cutoffs)

If your training data ends before ~2026, these are the verified facts that make this repo's design choices sensible rather than paranoid:

- **The harness dominates the outcome, not the model.** The same model swings ~9.5 points on SWE-bench Pro purely from harness choice (arXiv 2605.23950; corroborated by Harness-Bench, 5,194 trajectories). That is why this repo is a harness — a file-based, inspectable, gate-able loop — and not a framework integration. Full citations: `bench/HARNESS-RESEARCH.md`; argument: README "Why a harness, not a framework".
- **Agents systematically over-report success.** Post-execution agents are overconfident by up to 55 points (succeed 22%, predict 77% — arXiv 2602.06948), and 2026 frontier models reward-hack 49–54% of impossible tasks (ImpossibleBench, arXiv 2510.20270). That is why "done" requires **evidence on disk** re-verified by the gate, why the **evaluator is a fresh context** (a self-verifying agent can be incentivized to fake its own check — arXiv 2511.18397), and why the **assertion-shield** blocks test-weakening at commit time. Full analysis: `docs/bounded-vs-afk-strategy.md`.
- **First-party guidance converged on this repo's exact pattern.** Anthropic's long-running-agent guidance recommends a JSON feature list, passes-flip-only state, and hard no-test-editing rules — this repo is the mechanically-enforced version (verified 3-0, 2026-07-02, DECISIONS). The platform keeps absorbing harness layers natively (dynamic workflows, /code-review, destructive-git guards, sandboxing), so the standing doctrine is **prune toward native via gated cycles** — each prune its own reviewed change, because these hooks also protect CI and non-Claude harnesses where native settings don't apply.
- **Model facts rot in weeks, not years.** This repo ran Sonnet 5 builders for two weeks while its own docs said Sonnet 4.6 — the alias moved when a new model shipped 3 weeks after the last verification stamp (2026-07-16, DECISIONS). That is why the freshness rule (§5) exists, why `model-policy.json` carries `last_verified` stamps, and why this ledger exists.
- **A verification stamp on an unchecked claim is worse than no stamp.** Twice in one day this repo caught "verified" annotations certifying checks nobody performed (Dependabot comment drift; a haiku-alias over-claim caught by the evaluator). Precision discipline here: verbatim quotes, `not stated`, `UNVERIFIED`.

## 2. Frontier model catalog

> Maintained by `/research` only. "Cutoff" columns use each vendor's own terms; Anthropic distinguishes **reliable** knowledge cutoff ("date through which a model's knowledge is most extensive and reliable") from the broader **training data** cutoff. No vendor publishes day-level precision for Anthropic/Google models — month/year is all that exists. Web-search/tool-use features can reach past any cutoff at runtime; the cutoff matters for what the model *knows unprompted*.

### Anthropic (verified 2026-07-16 — [models overview](https://platform.claude.com/docs/en/about-claude/models/overview) · [pricing](https://platform.claude.com/docs/en/about-claude/pricing))

| Model | API ID | Released | Cutoff (reliable / training) | $/MTok in/out | Tokenizer | Status |
|---|---|---|---|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 2026-06-09 (GA) | Jan 2026 / Jan 2026 | $10 / $50 | new | Active; "most capable widely released model" |
| Claude Opus 4.8 | `claude-opus-4-8` | 2026-05-28 | Jan 2026 / Jan 2026 | $5 / $25 | new | Active |
| Claude Sonnet 5 | `claude-sonnet-5` | 2026-06-30 | Jan 2026 / Jan 2026 | **$2/$10 intro → 2026-08-31**, then $3/$15 | new | Active; default on Free/Pro |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 2025-10-15 | Feb 2025 / Jul 2025 | $1 / $5 | previous | Active |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | *(not re-fetched)* | Aug 2025 / Jan 2026 | $3 / $15 | previous | Active, legacy accordion |

**Tokenizer economics (verified 2026-07-16, [token-counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)):** Opus 4.7+, Fable 5, Mythos 5 and Sonnet 5 use a newer tokenizer producing **~30% more tokens (typical; ~35% ceiling)** for the same text; Sonnet 4.6-and-earlier and Haiku 4.5 use the previous one. Per-token prices only compare **within** a generation: Sonnet 5 vs Opus 4.8 (40% now, 60% from Sept) is apples-to-apples; Haiku's $1/$5 understates its real advantage; "Sonnet 5 vs 4.6" is not a pure price comparison.

**Alias semantics (verified 2026-07-16, [model-config](https://code.claude.com/docs/en/model-config)):** 4.6+-generation dateless IDs are **pinned snapshots**, not evergreen. Claude Code's bare family aliases resolve **per provider** — tabulated for `opus`/`sonnet` only: `sonnet` = Sonnet 5 (Anthropic API) / Sonnet 4.6 (Claude Platform on AWS) / Sonnet 4.5 (Bedrock, GCP); `opus` = Opus 4.8 everywhere except Opus 4.6 (MS Foundry). `haiku`: per-provider in principle, **no published table** — do not assume stability across backends. This repo runs Anthropic first-party (`model-policy.json._provider`).

### Google (verified 2026-07-16 — [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog) · [what's new](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5) · [DeepMind models](https://deepmind.google/models/gemini/))

| Model | API ID | Released | Cutoff | Status |
|---|---|---|---|---|
| Gemini 3.5 Flash | `gemini-3.5-flash` | 2026-05-19 (GA) | Jan 2025 | GA; default in Gemini app + AI Mode in Search |
| Gemini 3.5 Pro | — | **not GA** | — | "rolling out next month" said 2026-05-19; still not GA at verification. Rumored dates/specs are third-party only — UNVERIFIED |
| Gemini 3.1 Pro / 3.1 Flash-Lite / 3.1 Deep Think | various | — | *(not fetched)* | Current family per DeepMind page; no "Ultra" in the active lineup |

### xAI (verified 2026-07-16 — [grok-4.5 news](https://x.ai/news/grok-4-5) · [models](https://docs.x.ai/developers/models))

| Model | API ID | Released | Cutoff | Specs | Status |
|---|---|---|---|---|---|
| Grok 4.5 | `grok-4.5` (aliases `grok-4.5-latest`, `grok-build-latest`) | ~2026-07-08 (page dated Jul 16; press says Jul 8 — exact day UNVERIFIED) | **Feb 1, 2026** (stated verbatim) | 500k ctx; $2/$6 per MTok (<200k prompt); reasoning effort low/med/high | GA; **not yet in the EU**; "trained alongside Cursor" |
| Grok 4.3 / 4.20 variants / grok-build-0.1 | per docs | — | *(4.3 cutoff: third-party claim only — UNVERIFIED)* | 1M ctx (4.3/4.20) | Active |

*Naming caution: xAI's live pages self-brand as "SpaceXAI" — consistent across x.ai and docs.x.ai at verification, noted without further corroboration.*

### OpenAI (verified 2026-07-16 — [GA post](https://openai.com/index/gpt-5-6/) · [models](https://developers.openai.com/api/docs/models))

| Model | API ID | Released | Cutoff | Specs | Status |
|---|---|---|---|---|---|
| GPT-5.6 Sol | `gpt-5.6-sol` (alias `gpt-5.6`) | 2026-07-09 (GA; preview 2026-06-26 was gated "at the request of the U.S. government") | **Feb 16, 2026** | 1,050,000-token context | GA — the flagship |
| GPT-5.6 Terra | per docs | 2026-07-09 | Feb 16, 2026 | — | GA — balanced tier, "competitive with GPT-5.5" |
| GPT-5.6 Luna | per docs | 2026-07-09 | Feb 16, 2026 | — | GA — fastest/cheapest tier |

*Naming note (verbatim from OpenAI): "the number identifies the generation, while Sol, Terra, and Luna are durable capability tiers that can advance on their own cadence" — so "ChatGPT 5.6 Sol" is generation 5.6, tier Sol, not a single model name.*

## 3. Model roles in this repo

**Switching surface (verified 2026-07-16, [model-config](https://code.claude.com/docs/en/model-config)):** in-session `/model <alias|id>` (picker confirms when history exists — the next response re-reads history uncached); at launch `claude --model <alias|id>`; env `ANTHROPIC_MODEL`; settings file `"model"` key. `--model`/env apply per-session — run parallel terminals with different models rather than toggling one session. Subagents: `CLAUDE_CODE_SUBAGENT_MODEL` env → per-invocation `model` param → frontmatter → inherit.

| Role | Model | Where it's set |
|---|---|---|
| **Planner / auditor** (orchestrator sessions, hardest evaluation passes) | **Fable 5** (`claude-fable-5`) when available; Opus 4.8 otherwise | Session-level: `claude --model claude-fable-5` or `/model`; per-invocation subagent override for a single hard pass. Deliberately NOT the `reasoning` tier default: Fable is 2× Opus per token and its subscription-inclusion terms are UNVERIFIED — flipping every evaluator run to it is a cost decision, not a docs change. |
| **Implementer** | Opus 4.8 (`builder-strong`, Tier C) / Sonnet 5 (`builder`, Tier A/B) | `.claude/model-policy.json` (enforced by `check-model-policy.ts`) |
| **Researcher** (deep-research fan-out — the highest-token activity by far) | Sonnet 5 | Per-invocation `model: 'sonnet'` on workflow/research agents |
| **Scout** (explore/triage fan-out) | Haiku 4.5 | `fast` tier, model-policy |
| **Second opinions** (general-purpose, secondary to Opus 4.8) | Gemini 3.5 Flash · GPT-5.6 Sol/Terra | **External lanes — not integrated by design** (plan §2.1: the operator's parallel subscriptions are used side-by-side, never wired into the engine) |

## 4. Verified findings ledger (append per /research pass; supersede in place)

| Date | Finding | Source |
|---|---|---|
| 2026-07-02 | Build-vs-adopt verdict: KEEP — no existing OSS/commercial system replaces the evidence-gated core; CCPM closest but lacks the gate/shield/tier machinery; prune toward native via gated cycles | DECISIONS 2026-07-02 (105-agent pass) |
| 2026-07-16 | Sonnet 5 released 2026-06-30; two-phase pricing ($2/$10 → $3/$15 on 2026-09-01); `sonnet` alias moved to it on Anthropic API | pricing + news pages, DECISIONS |
| 2026-07-16 | Tokenizer generations split the catalog (~30% typical, ~35% ceiling); per-token price comparisons valid only within a generation | pricing + token-counting + migration guide |
| 2026-07-16 | Claude Code ≥2.1.211 fixes: PreToolUse `ask` honored in auto mode; subagent model-override survives resume; hook-timeout no longer misreported as user rejection (2.1.210) | claude-code CHANGELOG |
| 2026-07-16 | No native equivalent found for: guard-bash's secret-shaped-content POST scan; PowerShell `.env`-read patterns; `AGENT_STOP` kill switch — these hooks stay load-bearing | claude-code docs sweep (44-claim verified pass) |
| 2026-07-16 | AGENTS.md standard: healthy (AAIF/Linux Foundation; 60k+ projects claim, single-source); Codex reads AGENTS.md chain, 32 KiB default cap; this repo's stub-pointer shape is correct | learn.chatgpt.com docs, LF press |
| 2026-07-16 | `.codex/agents/*.toml` custom-subagent layout is real but UNVERIFIED against the current Codex CLI (possible regression #26363) — smoke-test before first real use | learn.chatgpt.com/docs/agent-configuration/subagents |
| 2026-07-16 | Cross-vendor frontier catalog verified (66-agent pass, per-lane sampled 2-vote): §2 tables above; 30 load-bearing claims beyond the sample not verified | this file §2 |
| 2026-07-17 | Instruction-file size discipline is now vendor doctrine + tooling: Claude docs target <200 lines/CLAUDE.md ("Bloated CLAUDE.md files cause Claude to ignore your actual instructions"; `/doctor` proposes trims; warning scales with context window); Codex hard-caps combined AGENTS.md at 32 KiB; ETH-Zurich-reported result: LLM-generated context files ≈ −3% success / +20% cost (secondary source — exact %s UNVERIFIED) | code.claude.com/docs/en/memory + /best-practices; learn.chatgpt.com/docs/agent-configuration/agents-md; MarkTechPost 2026-02-25 |
| 2026-07-17 | Durable-harness thesis — two primary sources, NOT a field-wide consensus: "the hard, valuable part of a loop is designing the check that decides when the work is done" (arXiv 2607.00038, a self-described position paper); "every component in a harness encodes an assumption about what the model can't do on its own" + "find the simplest solution possible" + fresh-context judging "a strong lever" (Anthropic harness-design 2026-03-24). The generalization to "verification/state/guardrails endure, other scaffolding rots" (README principle 6) is THIS REPO'S bet built on those two, not a claim either source makes | anthropic.com/engineering/harness-design-long-running-apps; arxiv.org/html/2607.00038v1 |
| 2026-07-17 | Template-repo landscape bifurcated: Agent-OS v3 (2026-01) explicitly shrank — spec-writing/task-breakdown/orchestration "much better handled by the core tools than 3rd-party frameworks"; BMAD + Spec Kit still growing; Ralph loop absorbed as a first-party Anthropic plugin (ralph-wiggum); Pi harness ≈1k-token system prompt. Near-universal across live frameworks: spec-first, state-in-files, multi-platform support | github.com/buildermethods/agent-os (discussion 310); github.com/anthropics/claude-code plugins/ralph-wiggum; repos fetched 2026-07-17 |
| 2026-07-17 | Native guardrail absorption, Claude Code: OS-level sandboxing (Seatbelt/bubblewrap), credential masking (NO built-in deny list — you enumerate what to protect), Auto-mode risk classifier, hard block on `rm` of `/`/home even under `--dangerously-skip-permissions`, native `/goal` loop; PreToolUse hooks remain the customer-authored layer. Cross-vendor: risk-tiered autonomy is recognized practice (Codex sandbox×approval matrix + fail-closed reviewer; GitHub Copilot agent structurally cannot self-approve/merge); Anthropic best-practices doc instructs "Have Claude show evidence rather than asserting success" (verbatim) | code.claude.com/docs/en/sandboxing + /hooks + /best-practices; learn.chatgpt.com/docs/agent-approvals-security; docs.github.com copilot cloud-agent risks-and-mitigations |

## 5. Maintenance

- **Writer:** `/research` only, with live sources; every entry gets `last_verified` + URL.
- **Reader:** any session, before spending research tokens (CLAUDE.md §5).
- **Staleness:** entries >3 months old are presumed stale — the repo's own rule applies to this file hardest of all. The model catalog (§2) rides the same 30-day hygiene cadence as `model-policy.json`.
- **Size discipline:** this file stays under ~150 lines; supersede rows in place rather than appending duplicates; git history is the archive.
