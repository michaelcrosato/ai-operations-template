---
name: research
description: Web-verify any AI/stack/tooling claim before relying on it (Operating Principle P1). The AI field changes week to week — anything not verified against live sources within ~3 months is stale by default. Maintains .claude/model-policy.json and docs/FRONTIER.md (the persistent verified-facts ledger).
---

# /research — verify before you trust

**Trigger discipline (P1):** before acting on any claim about AI models, pricing, Claude Code features, framework majors, security advisories, or third-party APIs, check its freshness. Sourced >3 months ago — or from model training memory — means **re-verify now**. This applies to *this engine's own documents*: AI_OPERATIONS_PLAN.md cites sources verified 2026-06-09; after ~2026-09 treat its tooling claims as stale too.

Procedure:
1. **Check `docs/FRONTIER.md` first.** A fact stamped `last_verified` <3 months ago is already verified — use it and stop; do not re-buy research the ledger already holds.
2. State the claim and the decision depending on it (one line each).
3. Web-search for the **official/primary source** (vendor docs, changelogs, release notes, security advisories). Cross-check ≥2 independent sources for anything load-bearing; prefer dated pages. **Weigh working public production repos over announcements and benchmarks** — what ships and survives in public repos separates working practice from hype.
4. Record verdict in the artifact that depends on it: confirmed (cite URL + date) / changed (update the doc AND log one line in DECISIONS.md) / unverifiable (say so explicitly; choose the conservative option).
5. **Write back to the ledger:** any durable, load-bearing finding (model catalog, cutoffs, pricing, platform capabilities, cross-vendor facts) goes into `docs/FRONTIER.md` with its `last_verified` date and source URL — that file is why the next session doesn't repeat this one's research. Precision discipline for ledger entries: quote identifiers verbatim; mark what the source does NOT state as `not stated` rather than inferring; carry unresolved claims as `UNVERIFIED`, never as fact.

Model-policy duty: any change to a `.claude/model-policy.json` mapping happens **only** through this skill — verify the official model catalog + pricing page, update the mapping, stamp `last_verified`, list the change in DECISIONS.md. The weekly hygiene routine re-runs this check; mappings older than 30 days get re-verified (the same pass refreshes FRONTIER.md's model rows).
