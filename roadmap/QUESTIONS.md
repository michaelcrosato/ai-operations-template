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
