# AI Capabilities & Coding Research — June 2026

**Date:** 2026-06-13/14 · **Method:** multi-agent live web sweep (14 agents) weighted toward **active software repositories** and primary registries (npm, GitHub releases, GitHub Advisory DB, LiteLLM `model_prices_and_context_window.json`), with an adversarial verification pass that tried to refute each claim. Frontier-lab blog claims are labeled and treated cautiously (marketing risk). Per the engine's P1 freshness rule, every claim was presumed wrong until a primary/active-repo source confirmed it.

> This document is the freshness record behind the model/version decisions in the F-0023 grooming and `docs/feedback-3-verification.md`. Re-verify before relying (dist-tags and model IDs move week to week).

## Frontier models (current IDs, verified)

| Vendor | Current top / flagship | API ID | Notes |
|---|---|---|---|
| Anthropic | Claude Fable 5 (most capable, widely released, GA 2026-06-09) | `claude-fable-5` | 1M ctx, 128k out, $10/$50. Sibling `claude-mythos-5` is invite-only (Project Glasswing), not GA. |
| Anthropic | Claude Opus 4.8 (Opus-tier flagship) | `claude-opus-4-8` | 1M ctx, 128k out, $5/$25, cutoff Jan 2026, adaptive thinking, effort defaults `high`. **This session runs `claude-opus-4-8[1m]`.** Dateless IDs are pinned snapshots, not evergreen. temperature/top_p return HTTP 400 on Opus 4.7+. |
| Anthropic | Sonnet 4.6 / Haiku 4.5 | `claude-sonnet-4-6` / `claude-haiku-4-5-20251001` (alias `claude-haiku-4-5`) | $3/$15 (1M ctx) and $1/$5 (200k ctx). |
| OpenAI | GPT-5.5 | `gpt-5.5` (snapshot `gpt-5.5-2026-04-23`) | ~1.05M ctx, $5/$30; `gpt-5.5-pro` $30/$180; GPT-5.2/5.4 superseded; coding line `gpt-5.3-codex` separate. |
| Google | Gemini 3.1 Pro (top reasoning/coding, **Preview**) / Gemini 3.5 Flash (**Stable** GA workhorse) | `gemini-3.1-pro-preview` / `gemini-3.5-flash` | Gemini 3.5 **Pro is not GA** as of 2026-06-13 (announced I/O 2026-05-19). |
| xAI | Grok 4.3 (flagship) / Grok Build 0.1 (coding specialist) | `grok-4.3` / `grok-build-0.1` | 1M ctx, $1.25/$2.50. **`grok-4` is STALE** — superseded by 4.1 → 4.20 → 4.3; `grok-4.1-fast` already deprecated (retires 2026-08-15). |

**Lifecycle caution:** Anthropic models go Active → Legacy → Deprecated → Retired (≥60 days notice); retired models fail outright. Any hardcoded dated model ID is a scheduled time bomb — centralize behind aliases/a registry.

## Current latest package versions (verified via npm registry, 2026-06-13)

| Package | Latest | This repo had | Action |
|---|---|---|---|
| next | 16.2.9 | `^15.3.1` (resolved 15.5.19) | 15.5.19 is **≥ the 15.5.18 May-2026 security floor** (13 advisories), so no urgent bump; **16.x is a breaking major → groom as a feature.** |
| postcss | 8.5.10+ (8.5.15 installed) | `^8.5.3` | **Fixed in this PR** (CVE-2026-41305 / GHSA-qx2v-qp2m-jg93, moderate XSS via Next's tree). Bumped direct dep + `overrides`. |
| zod | 4.4.3 | `^3.24.4` | v3→v4 is a **breaking major → groom.** |
| lucide-react | 1.18.0 | `^0.511.0` | 0.x→1.x **major transition → groom.** |
| @biomejs/biome | 2.5.0 | `^2.4.16` | minor; `^2.4.16` already permits 2.5.0 on install. Low priority. |

Do **not** run `npm audit fix --force` — it tries to downgrade Next to 9.3.3.

## What genuinely works (repo-backed, not hype)

- **Centralized/aliased model config as a single source of truth** (Aider `model-settings.yml`, LiteLLM model registry, Vercel AI SDK provider registry, LangChain `init_chat_model`). This repo's `.claude/model-policy.json` already does this correctly (tier names, not dated IDs) — so the model-currency fix applies to the **product** code, not the engine.
- **AST/structural assertion checking** over regex/string-diff (ast-grep ~14.5k★ with YAML CI rules + MCP server; tsDetect/PyNose test-smell detectors). Standard, with the caveat that AST guards over test code need test-aware tuning, and require syntactically valid input (keep a regex fallback).
- **Mutation testing as the "wiring" check beyond coverage** (Meta ACH/JiTTest in production; Mutahunter, StrykerJS). Real, recommended as a future gate.
- **Evidence/verification gates** (tests+lint+typecheck+CI before merge) — cross-vendor 2026 consensus. This repo's `verify.sh` + evidence-gated `passes:true` embodies it.
- **Execution/trajectory verification + environment hardening over prompt-only fixes** (OpenHands sandbox rewards; Reward-Hacking-Benchmark hardening cut exploits ~88% relative).
- **Fresh-context LLM-as-judge that is itself calibrated against deterministic ground truth** (JudgeBench: even GPT-4o barely above random un-anchored). Backs the repo's evaluator/security-reviewer step — and the open gap: **the judges themselves are untested** (groomed).
- **Git worktrees as the real parallel-agent isolation primitive**, and **one instrumented orchestrator + helper sub-agents** over free-form swarms. Matches the repo's orchestrator-only-delegation rule.
- **Cross-platform hook doctrine:** Git for Windows runs hooks via bundled `sh.exe`, so the real trap is **bash-only syntax** (and CRLF) more than PowerShell per se; pin `*.sh`/hooks to `eol=lf`; keep real logic in Node/TS; put security enforcement in **CI** because hooks are bypassable with `--no-verify`. (This repo already does the last point.)

## Hype / treat cautiously

- **All launch coding-benchmark numbers are lab-primary marketing until independently reproduced** (GPT-5.5 SWE-bench Verified 88.7% / Terminal-Bench 82.7%; Gemini 3.1 Pro 80.6%; any Grok "most intelligent/fastest"). SWE-bench Verified is near-saturated/contamination-suspect at the top; SWE-bench Pro (Scale SEAL) and Terminal-Bench are the more serious evals.
- **Free-form multi-agent "swarms" are largely hype** despite high star counts (e.g. claude-flow ~58.5k★). What survives to production is a single instrumented orchestrator; documented failure modes: context inconsistency (#1), infinite handoff loops, orchestrator context-window bottleneck at 4+ workers, cost blowups. **Star count ≠ adoption.**
- **Roadmap/parameter-count claims** ("Grok 5 at 6–10T params", "7 models in training", Gemini 3.5 Pro "June GA / 2M ctx") are aggregator speculation, no model card/API ID.
- **AI-authored-code share stats** (~73% of teams daily; Claude Code ~4% of public commits) are directionally strong but vendor-adjacent — treat exact numbers cautiously.
- **MCP adoption stats** (~9.6k servers, ~97M monthly SDK downloads) come from a single analytics source — directionally credible, exact numbers one-sourced.

## Key sources

platform.claude.com/docs/en/about-claude/models/overview · developers.openai.com/api/docs/models/gpt-5.5 · ai.google.dev/gemini-api/docs/models · LiteLLM `model_prices_and_context_window.json` (BerriAI/litellm) · GitHub Advisory GHSA-qx2v-qp2m-jg93 (CVE-2026-41305) · npm registry (next/zod/lucide-react/@biomejs/biome/postcss) · ast-grep, StrykerJS, OpenHands, JudgeBench repos.
