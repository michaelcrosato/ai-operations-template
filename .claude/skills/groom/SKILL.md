---
name: groom
description: Decompose ROADMAP.md bullets and the product spec into features.json entries with acceptance criteria, paths, and dependencies. Also folds answered QUESTIONS.md items into specs and DECISIONS.md.
---

# /groom — roadmap → machine backlog

1. Read `roadmap/ROADMAP.md` (operator priorities, top = most urgent), the product spec (`README.md`), and `roadmap/QUESTIONS.md` for fresh operator answers.
2. **Fold answers in first:** each answered question becomes a DECISIONS.md line and, where it changes scope, a spec/feature edit. Mark the question "(answered, folded YYYY-MM-DD)".
3. For each un-groomed "Now"/"Next" bullet, write 1–N features sized for **one builder session each** (one focused PR; if you can't list its acceptance tests, split it). **Ambiguity gate (`TASK_AUTONOMY_TRIAGE.md` §4):** if a feature's "done" cannot be stated as a one-sentence verifiable criterion mapping to a `verify.sh` command, do NOT groom it — log the open question in `QUESTIONS.md` and move on. Never brief a builder on an underspecified task. Every feature gets:
   - `id` (next free F-XXXX), `epic`, `title`, `spec_ref` (real anchor), 2-sentence `description`
   - `acceptance`: 2–6 *testable* criteria (each maps to a unit/E2E test — "works correctly" is banned)
   - `authorized_paths` / `forbidden_paths` (always forbid `.claude/**` and `.github/workflows/**` for product features)
   - `tier` (A/B/C per `TASK_AUTONOMY_TRIAGE.md`): **A** = delegable/pattern-conformant; **B** = supervised/multi-file/bug-fix (the default); **C** = security/crypto/auth, irreversible (DB migration, deploy, IAM), or ambiguous-judgment. The fresh-context evaluator runs on ALL tiers (never sampled); tier adds the **security-reviewer** (mandatory on C) and the **human-approval merge gate** (C only)
   - `dependencies` (feature IDs), `priority` (1 = Now, 2 = Next, 3 = Later)
4. Add via `npx ts-node scripts/update-state.ts --add '<json>'` — never hand-edit features.json (a hook blocks it anyway).
5. Sanity pass: no dependency cycles; nothing depends on a `blocked` feature without a note; priorities mirror ROADMAP ordering.
6. Record a one-line PROGRESS.md note: how many features added, from which bullets.
