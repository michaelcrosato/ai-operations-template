# Roadmap

> **Operator: this is your file.** Plain-English bullets; reorder to change priorities. Agents only ever mark items "✅ shipped (PR #n)" — they never rewrite your words. Sections mean: **Now** = working on it, **Next** = queued, **Later** = someday, **Ideas** = unscoped thoughts.

## Now
- Build the engine itself so it matches its own blueprint (agents, skills, hooks, gates, CI). ✅ shipped (PR #1, #3)
- Prove the whole loop end-to-end on one deliberately trivial feature before trusting it. ✅ shipped (PR #14)
- Build a real, self-verifying benchmark so engine changes are measured, not guessed — fast probes + an end-to-end oracle suite + the engine-effect experiment. ✅ shipped (PRs #105–#116)
- Documentation accuracy & honesty pass — operational-status labels, a documentation map, and archiving stale internal review artifacts. ✅ shipped (this docs PR)

## Next
- Contract tests for every hook script — the safety net must be tested code, not vibes. ✅ shipped (PR #1, expanded PR #3)
- Nightly autonomous run (Routine) once a week of supervised runs is clean.
- Point the engine-effect benchmark at fix-and-improve-existing-code (refactoring/regression) tasks — build-from-scratch tasks already score 1.0, so they reveal no process lift.

## Later
- E2E browser verification lane wired to the QA deployment surface.
- Cost/usage line in the daily status report.

## Ideas
- Heterogeneous second-opinion review (different model family) before security-sensitive releases.
