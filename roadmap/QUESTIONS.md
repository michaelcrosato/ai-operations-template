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

## Q-0003 (2026-06-14) — Review-remediation follow-ups (non-blocking)

From the 5-source external-review remediation (`docs/feedback-3-verification.md`). None block the loop; defaults were applied meanwhile.

1. **Landing-page brand voice.** The fabricated proof (fake customer logos, "4,812 workflows", "facts verified live") is removed and replaced with honest synthetic/demo wording. The competitor comparison table is kept but re-captioned "illustrative, not independently verified." · *Why it matters:* branding/legal tone is the operator's call. · *Assumed meanwhile:* conservative honesty (removed false claims; kept the demo positioning). Want it neutralized further (drop named competitors/pricing), or restyled?

2. **Priority of the groomed + recommended fixes.** Newly groomed: F-0021 (F-0018 canvas RBAC enforcement + E2E), F-0022 (arm the F-0007 path guard), F-0023 (product model-currency / grok-4 → grok-4.3 registry). Recommended-but-not-yet-groomed: src/forge CJS→TS migration, page.tsx decomposition, AST assertion-shield, judge fixtures, E2E program, guard-bash hardening, major dep upgrades (next 16 / zod 4 / lucide 1), verify.sh Node port. · *Why it matters:* sequencing is roadmap-level. · *Assumed meanwhile:* HIGH trust-failures (F-0021, F-0022) at priority 1; rest queued. Re-rank as you like.

3. **Major dependency upgrades.** next 15→16, zod 3→4, lucide-react 0.x→1.x are current-latest but breaking majors. · *Why it matters:* they need scoped, tested migrations, not blanket bumps. · *Assumed meanwhile:* left pinned; the security-relevant floor (Next ≥15.5.18, postcss ≥8.5.10) is already satisfied. Greenlight the upgrade features when ready.
