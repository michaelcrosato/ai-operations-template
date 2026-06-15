# Task Autonomy Triage

How much autonomy a task gets, and where a human is required. `/groom` assigns each feature a
`tier` (A/B/C — a validated field on `features.json`); `/work` routes review depth by it. This
extends the per-*decision* rule in `CLAUDE.md §4` (decide-and-document) to whole *tasks*.

This **never blocks the loop** (P2). "Human required" means gate the irreversible *merge/action*
behind operator approval and keep building behind a flag/branch — never stop and wait.

## 1. The gate principle — consequences, not difficulty
Route a human by **irreversibility × blast radius**, NOT by how hard the task is. A hard-but-
reversible refactor can run autonomously; a trivial-but-irreversible `DROP COLUMN`, prod deploy,
or IAM change cannot. Only ~0.8% of agent actions are irreversible — a good gate touches a tiny
minority of work, but that minority carries the highest impact, so weight by impact, not frequency.

## 2. Tiers (groom sets `tier`; work routes on it)
- **Tier A — delegable (autonomy OK).** Pattern-conformant greenfield scaffolding /
  CRUD, components-from-spec, pattern-following refactors *with a real test oracle*, docs/docstrings,
  dependency/version bumps & framework migrations (the test suite is the oracle). `/work`: builder →
  the **mandatory** fresh-context evaluator (runs on EVERY feature, every tier — never sampled); no
  security-reviewer unless a sensitive path; merge on green. Collapses on novel custom glue — if the
  task invents a new integration with no example, groom it Tier B.
- **Tier B — supervised (mandatory evaluator).** Non-trivial bug fixes, medium refactors, multi-file
  features, legacy-codebase changes, third-party API integration, UI/UX, test generation, debugging
  from a stack trace, code translation, data/ETL. The default operating point. `/work`: builder →
  **mandatory** fresh-context evaluator (+ security-reviewer on sensitive paths).
- **Tier C — human directs / approval-gated.** Security-critical & cryptographic code, auth/authz,
  input validation, **performance tuning** (no profiling oracle), DB schema/migrations, IaC/deploy/IAM,
  novel architecture, concurrency/distributed correctness, embedded/systems, and anything with
  **ambiguous/contested requirements or product-UX judgment**. `/work`: builder → evaluator +
  **mandatory security-reviewer** → build behind a flag; **do not merge** the irreversible/visible
  surface until the operator approves (a `QUESTIONS.md` line + the PR), but keep the loop moving on
  other features.

## 3. Action gate (applied at SHIP / tool-use)
- **AUTO** — read/analyze, internal-only, reversible, low blast radius → just do it.
- **LOG** — research/web, low external impact → do it, note in `DECISIONS.md`.
- **REQUIRE_APPROVAL** — deploy/push to prod, DB migration, data export/deletion, IAM/secrets, a
  trust boundary, or operator-visible (pricing/branding/legal) → build behind a flag/branch, write
  the QA + an approval request, **do not merge to the live/irreversible surface until approved.**

## 4. Two hard rules (non-negotiable)
1. **Trust-boundary code → mandatory human security review.** Auth, crypto, input handling, secrets.
   Agent security *degrades with iteration* — more loops make it worse — so the `security-reviewer`
   PASS is necessary but not sufficient; a human signs off before merge. (~45% of security tasks get
   an insecure choice; bigger models are not safer.)
2. **Ambiguity → human specifies intent.** If acceptance can't be written as a **one-sentence
   verifiable criterion**, do NOT brief a builder. Route to `QUESTIONS.md` (non-blocking), hold the
   task, take the next feature. Agents hallucinate assumptions rather than ask (~60–90% collapse
   under vague specs).

## 5. Autonomy level — match, don't maximize
The control variable: **can you write a one-sentence, verifiable acceptance criterion that maps to a
`verify.sh` command?** Yes → **L3** (autonomous PR from a briefed task — Tier A/B path). No → **L2**
(human-in-loop): hold; sharpen the spec via `/groom` or `QUESTIONS.md` first. Never promote an
underspecified task to L3 — "agents amplify bottlenecks" when the pipeline is loose.

## 6. Failure mode → counter-gate (✅ = already enforced by this engine)
- Reward-hacking / test-tampering → **✅ assertion-shield** + evaluator diffs tests; **✅ mutation-smoke**
  proves the safety-critical tests have teeth (F-TC4).
- Hallucinated "done" → **✅ default-FAIL `features.json` (`passes:true` only with proof on disk)** +
  **✅ commit-aware evidence capture** (CAPTURE-EXIT load-bearing, F-EC1).
- Self-review collusion → **✅ fresh-context `evaluator`** (read-only, sees diff+spec); human at trust
  boundaries.
- Out-of-scope edit → **✅ canonicalizing fail-closed path-guard** (F-0034).
- Underspecification → **§4 rule 2** ambiguity gate at groom.
- Green-but-vacuous tests → **✅ mutation-smoke** (extend its mutant set per module over time).

## 7. How it plugs into the loop
- **`/groom`:** assign `tier` (A/B/C) and apply §4 rule 2 — do not groom a feature whose "done" lacks
  a one-sentence verifiable criterion; route it to `QUESTIONS.md` instead.
- **BRIEF:** state the tier and the action gate (§3) in the immutable brief so the builder knows the
  merge constraint up front.
- **JUDGE (`/work` step 5):** the fresh-context evaluator is **mandatory on every tier (never
  sampled)** — tier modulates the security-reviewer, the human-approval gate, and (later) model
  selection, NEVER the evaluator. A/B = evaluator (+ security-reviewer on sensitive paths), merge on
  green; C = evaluator + **mandatory** security-reviewer (tier-driven, not just path) + the
  REQUIRE_APPROVAL merge gate. Sensitive paths always add the security-reviewer regardless of tier.
- **Cost:** a task can be agent-shaped yet uneconomical — prefer the cheapest model/agent that clears
  the tier's gate (see `model-policy.json` per-tier agents).
