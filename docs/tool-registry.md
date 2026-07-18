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
- **Real and mature** (CONFIRMED): open-source `openai/codex` (Apache-2.0, ~99k stars); headless `codex exec`; stable 0.144.5 as of 2026-07-16 (release notes: expanded dangerous-`rm` detection). No codex-tuned GPT-5.6 variant exists — the CLI runs the standard Sol/Terra/Luna tiers.
- **Sandbox** (CONFIRMED, the strongest of the three): read-only / workspace-write / danger-full-access; OS-native enforcement (Seatbelt / bubblewrap / native Windows — the Windows-sandbox docs carry no "experimental" label as of 2026-07-18, two modes `elevated`/`unelevated` via ACLs, firewall rules, dedicated sandbox users); **network off by default**; declarative `config.toml`. `danger-full-access` is banned under this registry.
- **Auth** (CONFIRMED): ChatGPT-subscription OAuth (`codex login`) and API key (`OPENAI_API_KEY`) are **co-equal** paths — the "OAuth-first hierarchy" claim was refuted. A beta device-code flow covers browser-less headless runs, which fits the subscription-first rule (plan §7.2). **Plan inclusion confirmed 2026-07-18 (3-vote):** ChatGPT Plus and Pro include "Codex on the web, in the CLI, in the IDE extension, and on iOS" with published 5-hour-window message ranges (Plus: Sol 15–90 / Terra 20–110 / Luna 50–280; Pro 5×/20× higher); weekly limits mentioned, no figures.
- **Killed claim, do not reuse:** "Ultra mode subagents ≈ this repo's builder/evaluator split" — the mode is real, but its subagents are homogeneous workers with **no judge role**.
- **Resolved 2026-07-18:** MCP works in both directions per primary docs — client (`codex mcp add/list/get/remove`) and server (`codex mcp-server`, "Run Codex as an MCP server over stdio"); the CLI reference labels the server **Stable**, the in-repo protocol doc "experimental" — discrepancy carried.
- **Vendor limitation on record (irrelevant to our leaf-worker doctrine, which never uses external subagents):** under GPT-5.6 Sol's MultiAgent V2, `hide_spawn_agent_metadata=true` strips the model/agent_type fields from `spawn_agent`, so a Sol parent can't pin Terra/Luna subagents (openai/codex #31814, sibling #31882 — live mid-July 2026).

### Grok Build (xAI) — real; pricing conflict resolved, Windows-sandbox gap remains
- **Real and extensible** (CONFIRMED): `xai-org/grok-build`; TUI + headless `grok -p … --output-format streaming-json` + ACP; `grok inspect` documents instructions/skills/plugins/hooks/MCP; default model Grok 4.5. Repo active (three monorepo syncs 2026-07-16/17, incl. an SSRF fix in the hook runner) but **no version tags or releases yet** — nothing stable to pin.
- **Auth** (CONFIRMED dual-mode): browser OAuth default, `XAI_API_KEY` documented CI/CD path. **Tier-gate resolved 2026-07-18 against primary:** the x.ai/pricing matrix marks Grok Build included on **all six plans including Free**, and x.ai/cli says verbatim "Available to try for Free" (verified via real-browser DOM and curl-with-browser-UA — x.ai bot-blocks plain fetchers, which is what produced the earlier $30–$300 confusion in secondary sources). *Not stated on primary pages:* whether free access is standing or a ~7-day trial (secondary coverage says trial), and per-tier rate limits — check on first login.
- **Vendor sandbox now documented** (superseded 2026-07-18, 3-vote): `18-sandbox.md` — Landlock (+optional bubblewrap) on Linux, Seatbelt on macOS, seccomp child-network block; profiles `off/workspace/devbox/read-only/strict`; kernel-enforced deny-lists; irreversible once applied at startup. **Windows is not mentioned in the sandbox doc** — and this repo runs Windows, so a local lane still needs this repo's own isolation (optional-modules "Native sandboxing" row); the vendor sandbox would cover a Linux-CI lane only.
- **Killed 2026-07-18 (3-0 against primary), do not rely on:** "8 concurrent git-worktree subagents" / "Arena Mode" — `16-subagents.md` documents `spawn_subagent` with `isolation: none|worktree` and "the maximum nesting depth is one"; no numeric concurrency limit; no Arena.

### Antigravity CLI (Google) — headless exists after all; auth is the real blocker
- **Real** (well corroborated): launched at I/O 2026 (~2026-05-19). Framing refined 2026-07-17: Gemini CLI's **hosted serving for consumer AI Pro/Ultra** stopped 2026-06-18, but the OSS repo is **not archived** (v0.51.0 released 2026-07-16) — Antigravity is Google's stated "premier agent-first development platform" and forward-looking target.
- **The 2026-07-17 "no headless mode" answer was stale — corrected 2026-07-18 by the refuter pass:** headless `-p`/`--print` **exists** and the CLI's own CHANGELOG names it "headless" with an active fix history (v1.0.8 fixed the Windows non-TTY stdout drop; the flagship bug #76 was closed 2026-07-12, fixed by ~1.1.1). The docs *site* still documents only the interactive TUI. The remaining CI blocker is **auth**: no API-key path (maintainer verbatim, #78 open: "Gemini API Key is not supported currently… you can use the SDK") — unattended runs would ride a cached keyring OAuth session, untested; Google's recommended CI path is the separate **Antigravity SDK** (Python), a surface this registry has not evaluated.
- **Auth:** browser Google Sign-In + OS keyring — Apple Keychain / Linux secret-service / **Windows Credential Manager**; print mode can accept a pasted OAuth code (CHANGELOG v1.0.11). Individual tier **$0/mo** (agent models incl. Gemini 3.5 Flash, Gemini 3.1 Pro, Claude Sonnet & Opus 4.6, gpt-oss-120b); AI Ultra $100/mo = 5×, $200/mo = 20× Antigravity usage. Windows minimum: Windows 10 64-bit; terminal sandbox reportedly "AppContainer on Windows" (docs live-render, single-source, untested).
- **Killed claims, do not reuse:** "working multi-agent orchestration for real coding tasks" and "closest analog to this repo's architecture" — both refuted 2026-07-17; no rehabilitating evidence found since (the CLI's own bug tracker cuts the other way).
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

2026-07-18 frontier-delta pass (operator /goal): 3 live research lanes, then 10 claim bundles × 3 adversarial refuters (30 agents, 0 errors) before anything entered the ledger. Outcomes folded in above: Grok tier-gate resolved + vendor sandbox found (the refuters' primary fetches beat the secondary-source gating story); the Antigravity "no headless mode" finding from the same day's first lane was itself caught stale by the refuter pass (bug #76 had closed five days earlier) — the vote layer catching the research layer is the reason the vote layer exists. FRONTIER §4 rows dated 2026-07-18; DECISIONS 2026-07-18.
