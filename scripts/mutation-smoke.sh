#!/usr/bin/env bash
# scripts/mutation-smoke.sh (F-TC4): proves the engine's most safety-critical tests have TEETH.
#
# "All green" is necessary but not sufficient — a vacuous/tautological test passes against
# broken code too. For each known invariant we apply a deliberate mutation IN-TREE, run the
# guarding test, and require it to FAIL (the mutant is "killed"). A SURVIVING mutant (the test
# still passes against broken code) is a coverage hole and fails this gate.
#
# In-tree (not a tmp copy) is mandatory: every test imports its SUT by a literal relative path,
# so a mutated copy elsewhere would never be loaded — the original would always "survive" and
# the kill-rate would be a meaningless ~0%. We back each file up to a temp file first and restore
# it (cp-back) on EXIT/INT/TERM via a trap, so an interrupt can never leave the tree dirty; the
# backup preserves the exact working-tree contents (including any uncommitted WIP), so this is
# safe to run mid-build.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

fail=0
CUR_FILE=""
CUR_BAK=""
START_BAK=""
restore_cur() {
  if [ -n "$CUR_FILE" ] && [ -n "$CUR_BAK" ] && [ -f "$CUR_BAK" ]; then cp "$CUR_BAK" "$CUR_FILE"; fi
  [ -n "$CUR_BAK" ] && rm -f "$CUR_BAK"
  CUR_FILE=""; CUR_BAK=""
}
# Full cleanup runs ONLY on real exit (trap). mutate() calls restore_cur (per-mutation backup)
# and must NOT touch START_BAK — that is the comparison baseline for the whole run.
cleanup() { restore_cur; [ -n "$START_BAK" ] && rm -f "$START_BAK"; }
trap cleanup EXIT INT TERM

# mutate <file> <sed-expr> <test-cmd> <desc>: mutate in-tree, run the test, require it to FAIL.
mutate() {
  local file="$1" expr="$2" testcmd="$3" desc="$4"
  CUR_BAK="$(mktemp)"; cp "$file" "$CUR_BAK"; CUR_FILE="$file"
  sed "$expr" "$file" > "$file.mut" && mv "$file.mut" "$file"
  if cmp -s "$CUR_BAK" "$file"; then
    echo "  [ERROR]    mutation is a no-op (stale pattern — update it): $desc"; fail=1; restore_cur; return
  fi
  if eval "$testcmd" >/dev/null 2>&1; then
    echo "  [SURVIVED] $desc"; echo "             ^ the guarding test passed against MUTATED code — it does not constrain this invariant"; fail=1
  else
    echo "  [killed]   $desc"
  fi
  restore_cur
}

RBAC="src/forge/rbac.ts"
RBAC_TEST="node --test src/forge/rbac.test.ts"

# --selftest: validate the detection logic itself through the real mutate(). A mutation NO test
# catches (an untested allow-all principal) MUST be reported SURVIVED — a meta-gate that cannot
# flag a survivor is blind and worthless. Exit 0 iff the survivor was correctly flagged.
if [ "${1:-}" = "--selftest" ]; then
  echo "── mutation smoke SELFTEST: a known survivor must be flagged ──"
  mutate "$RBAC" "s/p === 'owner'/p === 'owner' || p === 'mutation_selftest_ghost'/" "$RBAC_TEST" "selftest: untested allow-all principal (expected to SURVIVE)"
  if [ "$fail" -ne 0 ]; then echo "── selftest: OK (survivor correctly flagged) ──"; exit 0; fi
  echo "── selftest: FAIL (a survivor was NOT flagged — detection is broken) ──"; exit 1
fi

# SUT must exist and its guarding test must be GREEN on UNMUTATED code first — otherwise "all
# mutants killed" is vacuous (an erroring/failing test reads as a kill for every mutation). Fail
# closed (security review #3/#5).
[ -f "$RBAC" ] || { echo "── mutation smoke: ERROR — $RBAC not found ──"; exit 1; }
if ! eval "$RBAC_TEST" >/dev/null 2>&1; then
  echo "── mutation smoke: ERROR — baseline test ($RBAC_TEST) is not green on unmutated code; kills are meaningless ──"
  exit 1
fi
# Capture the PRE-RUN content. The backstop compares against THIS (working-tree, WIP-inclusive)
# baseline — NOT git HEAD — so an agent mid-edit on rbac.ts is not false-failed (security review #1).
START_BAK="$(mktemp)"; cp "$RBAC" "$START_BAK"

echo "── mutation smoke: do the safety-critical tests actually constrain behavior? ──"
# Neuter owner's allow-all → owner-permission tests must fail.
mutate "$RBAC" "s/p === 'owner'/p === 'owner_MUTANT'/" "$RBAC_TEST" "rbac: owner allow-all disabled"
# Drop 'billing' from the org/billing deny-set → admin/editor billing-denial tests must fail.
mutate "$RBAC" "s/'org', 'billing'/'org'/" "$RBAC_TEST" "rbac: 'billing' removed from org/billing deny-set"
# Widen editor-mutable to 'secrets' → editor-scope (no-escalation) test must fail.
mutate "$RBAC" "s/new Set(\\['graph', 'template'\\])/new Set(['graph', 'template', 'secrets'])/" "$RBAC_TEST" "rbac: editor-mutable widened to include secrets"
# Break the fail-closed action contract (known-actions gate) → unknown/empty-action tests must fail.
mutate "$RBAC" "s/if (!KNOWN_ACTIONS.has(a)) return 'deny';/if (!KNOWN_ACTIONS.has(a)) { \\/* mutant: skip *\\/ }/" "$RBAC_TEST" "rbac: fail-closed unknown-action gate removed"

if [ "$fail" -ne 0 ]; then
  echo "── mutation smoke: FAILED — a mutant survived (a critical test is vacuous) ──"
  exit 1
fi
# Backstop: rbac.ts must be byte-identical to its PRE-RUN state (every mutation restored). Compared
# to the cp-backup baseline, NOT git HEAD, so legitimate uncommitted WIP cannot false-fail the gate.
if ! cmp -s "$START_BAK" "$RBAC"; then
  echo "── mutation smoke: ERROR — $RBAC was not restored to its pre-run state ──"
  exit 1
fi
echo "── mutation smoke: OK (every known mutant was killed by a test) ──"
