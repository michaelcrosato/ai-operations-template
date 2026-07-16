# Status Report — 2026-07-16

## Shipped this week

- **The factory's model paperwork now matches reality.** A newer, cheaper AI model came out on June 30. Our settings pointed at a nickname, and that nickname quietly started meaning the new model — so the factory has been using it for weeks. Nothing was broken and nothing was overcharged; the *notes* describing it were simply out of date, because they were last checked three weeks before the new model existed. They now name the exact model and its real price. **Worth knowing: that model is on introductory pricing until August 31.** After that date the builder work costs about half again as much per word. Nothing needs doing now — the date is written down so it does not slip past unnoticed.
- **We wrote down something we had been relying on without ever saying it.** The model nicknames mean *different models* depending on whose servers you run on. Ours are correct for the service we actually use, but they would silently mean older, weaker models somewhere else. That assumption is now recorded, so moving the factory to another provider forces a fresh check instead of quietly downgrading the work.
- **Three maintenance updates are in**, all through the full safety suite: two build-tool updates and the assistant integration, which this time brought a genuine security improvement (it hides more kinds of access token from logs). Each update also had its "who checked this, and when" note corrected — the update robot changes the version but cannot fix the note beside it, which left notes claiming checks that nobody had performed.

## Ready for your QA

There is no staging or preview link for this engine template. Since the latest release tag, **18** completed improvements still await a release-level local QA pass — unchanged from the last report, because everything done since has been maintenance and record-keeping rather than new behaviour you could click on:

- **One-shot tool — 3 improvements.** It now rejects work that is too broad, reports success only after the requested check truly passes, and closes command-chaining and proof-recording failure paths.
- **Installation and operator experience — 7 improvements.** Setup is complete; fresh-project installation, first-run checks, workflow consistency, shipping, and the operator guide are safer and easier to follow.
- **Safety and review controls — 8 improvements.** File boundaries, single-task discipline, reviewer tests, assertion protection, command guards, and Windows path handling are all stronger.

## In progress

Nothing is actively being built. Two jobs are queued:

- Split the oversized safety-test suite into smaller, easier-to-maintain parts without reducing coverage.
- **New this week:** teach the safety suite to check those "who checked this, and when" notes automatically. We have now corrected them by hand twice, which is the point at which the rule says a machine should be doing it.

## Blocked / needs you

- **⚠️ One safety rule is switched off, and our own records say it was switched back on.** The main line is set up to require a review approval before anything merges. That requirement is currently set to **zero approvals**. It was deliberately turned off for a one-time job in June, and the log says it was "restored immediately after" — it was not. The other protections are still on and working: nothing can merge without a pull request, and nothing can merge without the full safety suite passing. **This one is yours to fix — changing repository permissions is reserved to you, not the agents.** To restore it: open the repository on GitHub → **Settings** → **Branches** → edit the rule for `main` → tick **Require a pull request before merging** → set **Required approvals** to **1** → **Save changes**.
- One cleanup item remains intentionally set aside — reducing duplicated operating instructions without weakening the rules. **Correcting the last report:** it said this had failed two attempts. It had not. It was never attempted; the agents judged that the change would cost more clarity than it saved, and recorded that reasoning. It is a deliberate decision, not a failure.
- Not blocking: the one-shot tool still needs a product name and target customer when you are ready to choose them.

## Health

- ✅ All automated checks pass: **31 product tests and 464 safety contracts**, and every deliberate test mutation was caught — the safety tests genuinely constrain behaviour rather than just running.
- ✅ The tracker is honest: 30 items recorded, 27 finished with their proof re-checked on disk, 2 queued, 1 intentionally set aside.
- ✅ Every pinned build tool was re-checked against its official source this week and all of them are genuinely what they claim to be.
- ⚠️ No staging site is configured for this engine template, so the 18 unreleased improvements above require a local release QA pass.
- ⚠️ Five finished items are missing their one-line cost/outcome record. Nothing is wrong with the work — the receipts are just incomplete, so the running quality figures are drawn from 22 of 27 items rather than all of them. They are deliberately **not** being back-filled from memory: inventing records after the fact is exactly what this system is built to prevent.
- **Cost:** this was an expensive session by design — the deep research pass ran roughly 150 assistant helpers to re-check the model facts against live sources. It added no recurring service cost.
