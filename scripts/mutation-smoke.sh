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
START_BAK=""       # rbac pre-run baseline
US_START_BAK=""    # update-state.ts pre-run baseline
AS_START_BAK=""    # assertion-shield.ts pre-run baseline
MFIX=""            # update-state fixture dir
ASFIX=""           # assertion-shield git fixture repo
TSNODE="$ROOT/node_modules/ts-node/dist/bin.js"
restore_cur() {
  if [ -n "$CUR_FILE" ] && [ -n "$CUR_BAK" ] && [ -f "$CUR_BAK" ]; then cp "$CUR_BAK" "$CUR_FILE"; fi
  [ -n "$CUR_BAK" ] && rm -f "$CUR_BAK"
  CUR_FILE=""; CUR_BAK=""
}
# Full cleanup runs ONLY on real exit (trap). mutate() calls restore_cur (per-mutation backup)
# and must NOT touch the *_START_BAK baselines — those are the comparison baselines for the run.
cleanup() {
  restore_cur
  [ -n "$START_BAK" ] && rm -f "$START_BAK"
  [ -n "$US_START_BAK" ] && rm -f "$US_START_BAK"
  [ -n "$AS_START_BAK" ] && rm -f "$AS_START_BAK"
  [ -n "$MFIX" ] && rm -rf "$MFIX"
  [ -n "$ASFIX" ] && rm -rf "$ASFIX"
}
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

# ── update-state.ts: the state writer (the most-hardened guard surface this program) ──
# Killers are FAST + TARGETED: one ts-node call each (the full contract suite is ~86s — far too
# slow to run per-mutation). Each runs the writer on an input the guard MUST reject and inverts the
# exit code, so it exits 0 when the guard works (green baseline) and non-zero when a mutation removes
# it. Fixtures are crafted so ONLY the targeted guard rejects each input (no other invariant masks it).
US="scripts/update-state.ts"
us_must_reject() { # <fixture> <args…>: exit 0 iff update-state REJECTS (the targeted guard fired)
  if STATE_FILE="$1" node "$TSNODE" "$US" "${@:2}" >/dev/null 2>&1; then return 1; else return 0; fi
}
k_tier_c_done()   { us_must_reject "$MFIX/tc.json" --status F-9001 'done'; }      # Tier-C done-gate
k_single_wip()    { us_must_reject "$MFIX/twowip.json" --validate; }             # single-in_progress
k_aae_evidence()  { us_must_reject "$MFIX/aae.json" --validate; }                # awaiting_approval needs evidence
k_add_pending()   { # --add must reject a feature born non-pending
  if STATE_FILE="$MFIX/empty.json" node "$TSNODE" "$US" --add '{"id":"F-9003","epic":"t","title":"t","spec_ref":"t","description":"t","acceptance":["a"],"authorized_paths":[],"status":"awaiting_approval","evidence":["e"],"priority":1}' >/dev/null 2>&1; then return 1; else return 0; fi
}
if [ -f "$US" ]; then
  MFIX="$(mktemp -d)"
  printf '{ "features": [ { "id": "F-9001", "epic": "t", "title": "t", "spec_ref": "t", "description": "t", "acceptance": ["a"], "authorized_paths": [], "forbidden_paths": [], "dependencies": [], "priority": 1, "status": "in_progress", "passes": true, "evidence": ["e"], "attempts": 0, "blocked_reason": null, "tier": "C" } ] }\n' > "$MFIX/tc.json"
  printf '{ "features": [ { "id": "F-9001", "epic": "t", "title": "t", "spec_ref": "t", "description": "t", "acceptance": ["a"], "authorized_paths": [], "forbidden_paths": [], "dependencies": [], "priority": 1, "status": "in_progress", "passes": false, "evidence": [], "attempts": 0, "blocked_reason": null }, { "id": "F-9002", "epic": "t", "title": "t", "spec_ref": "t", "description": "t", "acceptance": ["a"], "authorized_paths": [], "forbidden_paths": [], "dependencies": [], "priority": 1, "status": "in_progress", "passes": false, "evidence": [], "attempts": 0, "blocked_reason": null } ] }\n' > "$MFIX/twowip.json"
  printf '{ "features": [] }\n' > "$MFIX/empty.json"
  printf '{ "features": [ { "id": "F-9001", "epic": "t", "title": "t", "spec_ref": "t", "description": "t", "acceptance": ["a"], "authorized_paths": [], "forbidden_paths": [], "dependencies": [], "priority": 1, "status": "awaiting_approval", "passes": false, "evidence": [], "attempts": 0, "blocked_reason": null } ] }\n' > "$MFIX/aae.json"
  if ! { k_tier_c_done && k_single_wip && k_add_pending && k_aae_evidence; }; then
    echo "── mutation smoke: ERROR — an update-state killer is not green on unmutated code; kills are meaningless ──"; exit 1
  fi
  US_START_BAK="$(mktemp)"; cp "$US" "$US_START_BAK"
  mutate "$US" "s/f.tier === 'C'/f.tier === 'C_MUT'/" "k_tier_c_done" "update-state: Tier-C done-gate removed"
  mutate "$US" "s/wip.length > 1/wip.length > 99/" "k_single_wip" "update-state: single-in_progress invariant removed"
  mutate "$US" "s/feature.status !== 'pending'/false/" "k_add_pending" "update-state: --add born-status pending guard removed"
  mutate "$US" "s/f.status === 'awaiting_approval' && f.evidence.length === 0/false/" "k_aae_evidence" "update-state: awaiting_approval-requires-evidence removed"
fi

# ── assertion-shield.ts: the test-deletion guard ──
AS="scripts/assertion-shield.ts"
shield_must_block() { # exit 0 iff the shield BLOCKS the staged assertion deletion in the fixture
  if ( cd "$ASFIX" && BASE_BRANCH=base node "$TSNODE" "$ROOT/$AS" >/dev/null 2>&1 ); then return 1; else return 0; fi
}
if [ -f "$AS" ]; then
  ASFIX="$(mktemp -d)"
  ( cd "$ASFIX" && git init -q && git config user.email t@t && git config user.name t \
    && mkdir tests && printf 'test("a", () => {\n  expect(1).toBe(1);\n});\n' > tests/a.test.js \
    && git add -A && git commit -qm base && git branch base \
    && printf 'test("a", () => {\n});\n' > tests/a.test.js && git add -A ) >/dev/null 2>&1
  if ! shield_must_block; then
    echo "── mutation smoke: ERROR — assertion-shield killer is not green on unmutated code ──"; exit 1
  fi
  AS_START_BAK="$(mktemp)"; cp "$AS" "$AS_START_BAK"
  mutate "$AS" "s/violations.length > 0/violations.length > 99/" "shield_must_block" "assertion-shield: deletion-detection gate removed"
fi

if [ "$fail" -ne 0 ]; then
  echo "── mutation smoke: FAILED — a mutant survived (a critical test is vacuous) ──"
  exit 1
fi
# Backstop: every mutated SUT must be byte-identical to its PRE-RUN state (all mutations restored).
# Compared to the cp-backup baselines, NOT git HEAD, so legitimate uncommitted WIP cannot false-fail.
for pair in "$START_BAK:$RBAC" "$US_START_BAK:$US" "$AS_START_BAK:$AS"; do
  bak="${pair%%:*}"; src="${pair#*:}"
  if [ -n "$bak" ] && ! cmp -s "$bak" "$src"; then
    echo "── mutation smoke: ERROR — $src was not restored to its pre-run state ──"; exit 1
  fi
done
echo "── mutation smoke: OK (every known mutant was killed by a test) ──"
