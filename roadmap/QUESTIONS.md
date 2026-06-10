# Questions for the Operator

> Agents append questions here **without stopping work** (CLAUDE.md §4). Format: question · why it matters · what was assumed meanwhile. Answer inline in plain English; the next `/groom` folds answers into specs and DECISIONS.md.

---

## Q-0001 (2026-06-09, open) — One-time GitHub/claude.ai setup needs you

**Question:** Several setup steps can only be done by a human with account access (F-0004): ① branch protection rules on `develop` and the stable branch (note: on a **private** repo this needs GitHub Pro; making the repo public also works), ② installing the Claude GitHub App and adding the `ANTHROPIC_API_KEY` Actions secret so `@claude` PR fixes work, ③ creating the claude.ai/code cloud environment with `scripts/init.sh` as the setup script. Full click-by-click list: `AI_OPERATIONS_PLAN.md` §11.

**Why it matters:** Until ① is done, nothing mechanically prevents a misbehaving session from pushing straight to `develop`; until ②, CI failures don't self-heal.

**Assumed meanwhile:** Work continues on feature branches + PRs as if protection were active (the constitution and hooks enforce the same rules in-session).
