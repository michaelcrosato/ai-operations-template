# Roadmap

> **Operator: this is your file.** Plain-English bullets; reorder to change priorities. Agents only ever mark items "✅ shipped (PR #n)" — they never rewrite your words. Sections mean: **Now** = working on it, **Next** = queued, **Later** = someday, **Ideas** = unscoped thoughts.

## Now
- Build the engine itself so it matches its own blueprint (agents, skills, hooks, gates, CI). ✅ shipped (PR #1, #3)
- Prove the whole loop end-to-end on one deliberately trivial feature before trusting it.

## Next
- Contract tests for every hook script — the safety net must be tested code, not vibes. ✅ shipped (PR #1, expanded PR #3)
- Nightly autonomous run (Routine) once a week of supervised runs is clean.

## Later
- E2E browser verification lane wired to the QA deployment surface.
- Cost/usage line in the daily status report.

## Ideas
- Heterogeneous second-opinion review (different model family) on promotion PRs.
