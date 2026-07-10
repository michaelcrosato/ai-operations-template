// Pure reliability/pass helpers for run-suite.mjs — extracted so the measurement logic is
// unit-testable in isolation (run-suite.mjs executes a suite on import, so its internals can't be
// imported without side effects). Tested by reliability.test.mjs.

// A run counts as a PASS only if the build FINISHED cleanly (the `claude -p` process exited 0 and
// did not report is_error), was NOT disqualified by anti-cheat, AND the oracle score met the task's
// pass_threshold. Gating on `finished` is the fix for the measurement bug where a timed-out / errored
// build that happened to leave a scoreable entrypoint was counted as a clean pass — which would
// inflate pass^k reliability numbers (a broken measurement is worse than no measurement).
export function isPass(rec, passThreshold) {
  return rec.finished === true && !rec.dq && (rec.oracle_score ?? 0) >= passThreshold;
}
