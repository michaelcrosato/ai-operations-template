# Status Report — 2026-07-18

## Shipped this week

- **We checked what four outside experts said about the project — and fixed the three real problems they found.** Every claim was tested against the actual code before we believed it; most turned out to be things we already knew and had written down, and some were just opinion. Three were real and are now fixed: (1) one finished job's written record still described an approach we had rejected mid-way — that record is corrected, there is now a proper guarded way to fix such records, and a new rule stops it happening silently again; (2) the small "one-shot" helper tool screened commands too loosely and had no time limit — both closed; (3) our "proof that a job passed its checks" files can now be forged less easily. We also audited all 27 previously-finished records the same way: 26 were already accurate, and the one exception was the record we just corrected.
- **We refreshed our notes on the newest outside AI models** (from OpenAI, xAI, and Google) so the project's reference notes match what those companies published this month. Nothing about how the project runs changed — the notes were simply brought current, every fact double-checked against the companies' own pages.
- **All branches were resolved and the records brought in line with reality** — the two safety-tier jobs waiting on your approval were finalized on your instruction, every branch is merged and cleaned up, and the public description, test counts, and dates are all current.

## Ready for your QA

There is no staging or preview link for this engine template. Since the last release, **21** completed improvements still await a release-level local QA pass. The most recent additions are internal safety and record-keeping strengthenings rather than new buttons to click:

- **One-shot tool — 3 improvements.** It now rejects work that is too broad, reports success only after the requested check truly passes, and (newest) refuses sneaky command forms and cuts off runaway commands.
- **Installation and operator experience — 7 improvements.** Setup, fresh-project installation, first-run checks, workflow consistency, shipping, and the operator guide are safer and easier to follow.
- **Safety and review controls — 11 improvements.** File boundaries, single-task discipline, reviewer tests, assertion protection, command guards, Windows path handling — plus this week's record-correction tool, proof-file tamper-evidence, and the full 27-record audit.

## In progress

Nothing is actively being built. Four jobs are queued (two safety-guard hardenings, one test-file cleanup, one build-check addition); none is urgent.

## Blocked / needs you

- **⚠️ One safety rule is switched off, and our own records once said it was switched back on.** The main line is set up to require a review approval before anything merges. That requirement is currently set to **zero approvals**. It was deliberately turned off for a one-time job in June and the log claimed it was restored right after — it was not. The other protections are still on and working: nothing merges without a pull request, and nothing merges without the full safety suite passing. **This one is yours to fix — changing repository permissions is reserved to you, not the agents.** To restore it: open the repository on GitHub → **Settings** → **Branches** → edit the rule for `main` → tick **Require a pull request before merging** → set **Required approvals** to **1** → **Save changes**.
- **Four questions are waiting for you, none blocking:** whether automated work may ever edit the safety-hook files with extra review; whether to switch on any outside AI coding tools as extra workers; whether to soften two bold sentences on the public page; and whether to support the Linux-under-Windows setup in addition to the current Windows path. All four are in plain English in the questions file.
- One job stays deliberately parked as "not worth doing" by engineering judgment (merging two near-identical safety checks) — revisit only if a related file grows too large.
- Not blocking: the one-shot tool still needs a product name and target customer when you are ready to choose them.

## Health

- ✅ **All automated checks pass** on the main line: **31 product tests and 490 safety contracts**, zero failures, and every deliberate test mutation was caught — the safety tests genuinely constrain behaviour rather than just running.
- ✅ **The tracker is honest:** 35 items recorded — 30 finished with their proof re-checked on disk, 4 queued, 1 intentionally set aside. Every branch is merged; nothing is left open.
- No staging site is configured for this engine template, so the unreleased improvements above require a local release QA pass; there is nothing to be up or down.
- **Test coverage trend:** up (464 safety contracts at the last report, now 490 — this week's record-correction and proof-file work added their own tests).
- ⚠️ **Five finished items are missing their one-line cost/outcome record** (they predate that discipline). The running quality figures are drawn from those that have records. They are deliberately **not** being back-filled from memory — inventing records after the fact is exactly what this system is built to prevent.
- **Cost note:** the everyday builder model is on introductory pricing until **August 31, 2026**; after that, routine build work costs roughly half again as much per word. Nothing to do now — the date is noted so it does not slip past.
