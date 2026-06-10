# Questions for the Operator

> Agents append questions here **without stopping work** (CLAUDE.md §4). Format: question · why it matters · what was assumed meanwhile. Answer inline in plain English; the next `/groom` folds answers into specs and DECISIONS.md.

---

## Q-0001 (2026-06-09, open) — One-time GitHub/claude.ai setup needs you

**Question:** Several setup steps can only be done by a human with account access (F-0004): ① branch protection rules on `develop` and the stable branch (note: on a **private** repo this needs GitHub Pro; making the repo public also works), ② installing the Claude GitHub App and adding the `ANTHROPIC_API_KEY` Actions secret so `@claude` PR fixes work, ③ creating the claude.ai/code cloud environment with `scripts/init.sh` as the setup script. Full click-by-click list: `AI_OPERATIONS_PLAN.md` §11.

**Why it matters:** Until ① is done, nothing mechanically prevents a misbehaving session from pushing straight to `develop`; until ②, CI failures don't self-heal.

**Assumed meanwhile:** Work continues on feature branches + PRs as if protection were active (the constitution and hooks enforce the same rules in-session).

---

## Q-0002 (2026-06-10, open) — Pick a license

**Question:** The repo has no LICENSE file, which means nobody else may legally reuse it — even though it's set up as a one-click GitHub template. Two sensible choices: **MIT** (shortest, most adoption-friendly — the usual pick for templates meant to be copied everywhere) or **Apache-2.0** (adds an explicit patent grant — the conservative pick if you expect companies to embed this in commercial products). One sentence back here is enough.

**Why it matters:** Blocks nothing today (repo is private), but must be decided before sharing it with anyone or making it public.

**Assumed meanwhile:** No license file; repo stays effectively all-rights-reserved.
