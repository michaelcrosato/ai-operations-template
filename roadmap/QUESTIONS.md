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

## Q-0003 (2026-06-14, RESOLVED 2026-06-14 by decide-and-document) — Review-remediation follow-ups (non-blocking)

From the 5-source external-review remediation (`docs/feedback-3-verification.md`). None blocked the loop; conservative defaults were applied, then resolved by decide-and-document (CLAUDE.md §4) so nothing stays "waiting on the operator." Each decision is reversible — adjust any of them whenever you like.

1. **Landing-page brand voice.** The fabricated proof (fake customer logos, "4,812 workflows", "facts verified live") was already removed and replaced with honest synthetic/demo wording, and the comparison table re-captioned "illustrative, not independently verified."
   · **DECISION (taken):** neutralized the table further — removed the *specific competitor pricing figures* ("$0 dev / $39/seat + ~$2.50/1k traces", "Per-second predictions" → generic "Per-seat + usage tiers" / "Usage-based") and softened two loaded characterizations ("retention upsell" → "Tracing-focused"; "Typical vendor lock" → "Hosted SaaS"). Named competitors and the structural comparison are kept (standard, fair-comparison practice), with the "illustrative, not independently verified" caption. This removes the false-advertising/defamation risk of asserting specific competitor prices while preserving the positioning. · *Reversible:* restore figures or restyle anytime. Logged in DECISIONS.md.

2. **Priority of the groomed + recommended fixes.** All three groomed items shipped (F-0021/F-0022/F-0023), plus the recommended backlog (F-0024 E2E, F-0025 guard self-bypass, F-0027 shield FP, F-0029 decomposition, F-0030 guard hardening, F-0031 deps, F-0026 judge tests).
   · **DECISION (recommended sequence for what remains):** (1) **F-0028 TS migration** — now unblocked by the shield rename-detection fix; in progress this session. (2) **Full `page.tsx` decomposition** — the canvas/graph-state extraction F-0029 deferred (needs a context restructure). (3) **Major dep upgrades** as individual scoped feature-PRs — see #3. (4) **`verify.sh` Node port** — cross-platform nicety, lowest urgency. · *Reversible:* re-rank anytime.

3. **Major dependency upgrades** (next 15→16, zod 3→4, lucide 0.x→1.x — lucide already done in F-0031).
   · **DECISION:** scheduled as a dedicated "dependency modernization" cycle of individual feature-PRs (one major per branch, each with its own scoped migration + tests — never blanket bumps), to run after the current review-remediation closes. **No urgency**: the security-relevant floor (Next ≥15.5.18, postcss ≥8.5.10) is already met, so this is maintenance, not risk. Each major must be re-verified for current stability/advisories via `/research` at start (freshness rule, CLAUDE.md §5). · *Greenlight needed only to start the cycle earlier than "when convenient."* Logged in DECISIONS.md.
