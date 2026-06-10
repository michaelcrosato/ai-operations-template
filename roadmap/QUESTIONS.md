# Questions for the Operator

> Agents append questions here **without stopping work** (CLAUDE.md §4). Format: question · why it matters · what was assumed meanwhile. Answer inline in plain English; the next `/groom` folds answers into specs and DECISIONS.md.

---

## Q-0001 (2026-06-09, partially resolved 2026-06-10) — One-time GitHub/claude.ai setup

**✅ Done (by the agent, with your authorization):** branch protection is ACTIVE — `develop` requires a pull request with a green "verify" check; `main` additionally requires 1 human approval; rules apply to admins too, and force-pushes/deletions are blocked.

**Still needs you (~15 minutes of clicking):**
1. **Install the Claude GitHub App** on this repository (claude.ai/code → settings → GitHub) — lets cloud sessions and `@claude` comments work.
2. **Add the `ANTHROPIC_API_KEY` secret** (repo → Settings → Secrets and variables → Actions → New repository secret) — without it, commenting `@claude fix this` on a PR does nothing.
3. **Create the cloud environment** at claude.ai/code (network: Trusted; setup script: `scripts/init.sh`) — enables cloud/mobile sessions and, later, scheduled Routines.

**Why it matters:** Until ② is set, CI failures don't self-heal and `@claude` comments are inert.

---

## Q-0002 (2026-06-10, answered & folded 2026-06-10) — Pick a license

**Question:** MIT or Apache-2.0?

**Answer (operator):** MIT.

**Folded:** `LICENSE` file added (MIT, © 2026 Michael Crosato), `package.json` license field set, decision logged in DECISIONS.md.
