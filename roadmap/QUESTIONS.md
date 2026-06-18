# Questions for the Operator

> Agents append questions here **without stopping work** (CLAUDE.md §4). Format: question · why it matters · what was assumed meanwhile. Answer inline in plain English; the next `/groom` folds answers into specs and DECISIONS.md.

---

## Q-0001 (2026-06-09, resolved 2026-06-13) — One-time GitHub/claude.ai setup

**✅ Done:**
1. **Branch protection is ACTIVE** — `develop` requires a pull request with a green "verify" check; `main` additionally requires 1 human approval; rules apply to admins too, and force-pushes/deletions are blocked.
2. **Claude GitHub App is installed** on this repository.
3. **CLAUDE_CODE_OAUTH_TOKEN secret is configured** on GitHub.
4. **Cloud environment created** at claude.ai/code with `scripts/init.sh` as setup script.

**Why it matters:** Setup is complete; the automated CI self-healing and Routine runs are now fully enabled.

---

## Q-0002 (2026-06-10, answered & folded 2026-06-10) — Pick a license

**Question:** MIT or Apache-2.0?

**Answer (operator):** MIT.

**Folded:** `LICENSE` file added (MIT, © 2026 Michael Crosato), `package.json` license field set, decision logged in DECISIONS.md.

---

## Q-0003 (2026-06-18, answered & folded 2026-06-18) — Do we split into two products: a "one-shot" tool and the current all-night engine?

**The situation in plain English.** Your direction note describes two genuinely different ways to use AI to build software, and you asked whether a real pivot should live on its own branch or fork. After reading your blueprint and checking the latest evidence against live sources, the answer is: **these are two different products, and the right move is to give the new one its own home while quietly reusing the safety machinery both share.** Think of it like two vehicles built on the same chassis:

- **Product A — the "one-shot" tool (the new direction).** It does one well-understood job at a time, in a single sitting, with a skilled person watching and approving. It deliberately stays inside what today's AI does most reliably. It expects the human to be a capable "manager of agents," not a hands-off client.
- **Product B — the all-night engine (what this repo is today).** It runs unattended for long stretches, builds bigger things across many sessions, and is designed so a *non-technical* operator never has to touch it.

The newest research backs your instinct that the one-shot approach is the more reliable lane today — with one important caveat: even on a "simple, solvable" job, the AI will sometimes *confidently say it's finished when it isn't*. So Product A still needs the core "prove it actually works" checks the engine already has — an independent reviewer, proof saved to disk, protected tests — with you as the final judge. (The engine's all-night-specific approval and model-routing steps don't apply to a supervised one-shot tool, so they'd be set aside, not reused.) The full write-up and sources are saved in the strategy record alongside this file.

**What I need from you (no rush — work continues meanwhile):**
1. **Green-light the split, or keep it on paper?** Should I actually start building Product A as its own thing now, or leave this as a written plan until you've decided?
2. **What do we call it / who is it for?** A name and a one-line "who buys this" would shape everything. (Skilled solo builders? Teams who want a tight, supervised tool?)
3. **What happens to the all-night engine in the meantime?** Pause its current to-do list and focus on the new tool, or keep both moving in parallel?

**What was assumed meanwhile (the safe default):** I changed nothing irreversible. No new repo or fork was created, the current engine's rules and its 21-item backlog are untouched, and the new direction exists only as a written strategy + this question. If you say "go," standing it up is a clean next step; if you say "wait," nothing needs undoing.

**Answer (operator, 2026-06-18):** "Let's build the new one-shot tool now. We are reducing the scope and being more precise about what we can do — if it works here, that is the start. Keep the power-to-weight ratio high: everything pulls its weight, all substance, no fluff."

- **Q1 (build now?) → YES.** Start building, but as a *deliberately minimal* slice built **here** as the seed (not a fork yet — that's the lighter, reversible start; the full fork stays deferred until the seed proves out).
- **Q3 (pause or parallel?) → parallel by default / moot.** The all-night engine's backlog is already 21/21 done, so there is nothing to pause; focus is on the new tool.
- **Q2 (name / who is it for?) → still open, intentionally deferred.** A brand/name and "who buys this" is the operator's call and is *not needed to build the internal harness*, which proceeds under the neutral technical directory `src/oneshot/`. Will revisit when there is something to brand. Not blocking.

**Folded (2026-06-18):** scope reduced to a 2-feature minimal loop — F-0040 (one-shot solvability admission gate) + F-0041 (evidence-gated verdict) — groomed into `features.json` (Tier B, priority 1, isolated in `src/oneshot/`, reusing the shared safety core, no new dependencies). Decision logged in DECISIONS.md; the richer human-referee / calibrated-doubt UX from the strategy record §5.4 is deliberately deferred until this core proves out ("if it works here, that is the start").
