# Tool Registry — external CLI / MCP tools

> **Machine-readable companion:** [`.claude/tool-policy.json`](../.claude/tool-policy.json). Activated **2026-07-17** — the "Tool registry artifacts" optional module ([`docs/optional-modules.md`](optional-modules.md)), stood up *ahead of* first live use because the standing rule (plan §2.3) requires it: *"any future external/MCP tool … requires a registry entry (purpose, trust level, env-named secrets, allowed commands, network needs, approval gate) before integration."*
>
> **Current state: three candidate tools registered, ZERO enabled.** Every entry gates on operator approval (`roadmap/QUESTIONS.md` Q-0005). This file and the JSON are declarative policy only — nothing reads them mechanically yet; enforcement wiring (allowlists, guard rules, verify checks) ships with the first enabled lane as its own Tier-C reviewed feature.

## The integration doctrine: sandboxed leaf worker, re-validated here

The 2026-07-17 research pass (92 claims, 25 adversarially vote-tested: 18 confirmed / 7 killed) established that **guardrails and subagent systems do not port across agent ecosystems**: every vendor CLI has its own incompatible hook/config/subagent model. Re-implementing this repo's guards natively per tool would be a ~3–4× maintenance surface with no shared event vocabulary. So any external tool that is ever enabled follows one pattern:

1. **One-shot leaf worker, invoked via Bash** — a single briefed task through the tool's headless mode (`codex exec`, `grok -p …`). Never a peer orchestrator; it spawns nothing.
2. **Sandboxed** — the tool's own sandbox where one exists (Codex), or this repo's OS-level sandboxing module where it doesn't (Grok Build runs locally with no vendor sandbox found in primary docs).
3. **Output captured to evidence** (`roadmap/evidence/…`), never trusted in place.
4. **Re-validated by THIS repo's existing machinery** — `scripts/verify.sh`, the assertion shield, and a fresh-context evaluator. The external tool's own review modes are **not** a substitute: no confirmed equivalent of this repo's fresh-context judge exists in any of the three ecosystems, and OpenAI's own subagent docs state there is *"no separate verification or judge role distinct from workers."*
5. **Security-reviewer on the diff** whenever the output touches a sensitive path — same as any other contribution.

**Trust level:** all entries are `untrusted-output` — the tool's product is treated exactly like external code arriving over the wall.

## The candidates (confidence tags from the adversarial pass — respect them)

### Codex CLI (OpenAI) — most verified, lowest-risk first candidate
- **Real and mature** (CONFIRMED): open-source `openai/codex` (Apache-2.0, ~99k stars); headless `codex exec`.
- **Sandbox** (CONFIRMED, the strongest of the three): read-only / workspace-write / danger-full-access; OS-native enforcement (Seatbelt / bubblewrap / native Windows); **network off by default**; declarative `config.toml`. `danger-full-access` is banned under this registry.
- **Auth** (CONFIRMED): ChatGPT-subscription OAuth (`codex login`) and API key (`OPENAI_API_KEY`) are **co-equal** paths — the "OAuth-first hierarchy" claim was refuted. A beta device-code flow covers browser-less headless runs, which fits the subscription-first rule (plan §7.2).
- **Killed claim, do not reuse:** "Ultra mode subagents ≈ this repo's builder/evaluator split" — the mode is real, but its subagents are homogeneous workers with **no judge role**.
- **Open:** both-direction MCP support is two-blog corroborated, not primary-checked.

### Grok Build (xAI) — real, blocked on a pricing conflict
- **Real and extensible** (CONFIRMED): `xai-org/grok-build`; TUI + headless `grok -p … --output-format streaming-json` + ACP; `grok inspect` documents instructions/skills/plugins/hooks/MCP; default model Grok 4.5.
- **Auth** (CONFIRMED dual-mode): browser OAuth default, `XAI_API_KEY` documented headless fallback. **CONFLICTING and unresolved:** which subscription tier unlocks CLI use — non-primary sources span $30/mo to $300/mo and the primary docs name no tier. **Resolve live before enabling.**
- **No vendor sandbox found in primary docs**; it executes locally (UNTESTED-strong that only API calls leave the machine). Isolation would be this repo's job (optional-modules "Native sandboxing" row) before enablement.
- **Unverified, do not rely on:** "8 concurrent git-worktree subagents" / "Arena Mode" — non-primary sources only.

### Antigravity CLI (Google) — verify before designing anything
- **Real** (well corroborated): launched at I/O 2026 (~2026-05-19); Gemini CLI retired in its favor (subscription serving stopped 2026-06-18) — Antigravity, not Gemini CLI, is the forward-looking Google target.
- **HARD OPEN QUESTION, check first:** a single untested source marks the CLI as **lacking headless/CI mode**. This repo's loop is entirely non-interactive — if true, that is a hard blocker. This is the first thing a live `/research` pass must settle.
- **Auth:** browser Google Sign-In + OS keyring (two-source corroborated, untested); higher tier reportedly $100/mo AI Ultra (untested); Google Cloud MCP surfaces use ADC / service-account impersonation (CONFIRMED for the Data Agent Kit extension only).
- **Killed claims, do not reuse:** "working multi-agent orchestration for real coding tasks" and "closest analog to this repo's architecture" — both refuted; independent reviews found orchestration unreliable in practice.
- **Single-sourced hooks claim** (5 lifecycle events, subagent primitives): one blog, primary docs silent — treat as unverified.

## How a lane gets enabled (in order, no shortcuts)

1. **Operator says yes** to Q-0005 (`roadmap/QUESTIONS.md`) — enabling a lane is operator-visible spend and is reserved to the operator (CLAUDE.md §4).
2. **Live `/research` pass** resolves that tool's open questions above (freshness rule §5; findings written back to `docs/FRONTIER.md` §4 and this registry's `last_reviewed`).
3. **A groomed Tier-C feature** does the wiring (registry `status` flip, permission allowlist, guard/verify integration). Registry and wiring files are sensitive paths — security-reviewer mandatory.
4. **Every run** follows the leaf-worker doctrine above: evidence on disk, this repo's gate, fresh evaluator.

## What this registry is NOT

- **Not model policy.** Claude Code sub-agent model assignment lives only in `.claude/model-policy.json` (`tiers`/`agents`); external vendor CLIs are tools, not tier models, and never appear there.
- **Not enforcement (yet).** Nothing reads these files mechanically; they are the contract the first enablement feature must implement.
- **Not a hooks surface.** No Claude Code hook fires on an external tool's internal events — no such event exists — so no hooks were added or changed for this registry.

## Research basis

2026-07-17 deep-research synthesis: 19 sources, 92 extracted claims, 25 adversarially vote-tested (3 votes each) → 18 confirmed / 7 killed; untested claims carried with source-quality tags (UNTESTED-strong / UNTESTED-weak / CONFLICTING). Durable verified findings: `docs/FRONTIER.md` §4 (rows dated 2026-07-17). Judgment calls: `roadmap/DECISIONS.md` (2026-07-17, external-CLI entries).
