#!/usr/bin/env bash
# verify.sh — THE gate (plan §7.1). One command, identical for agents and CI.
# Exit code is the only truth. Usage: bash scripts/verify.sh [--e2e]
# Stack-aware: runs whatever gates the repo defines; engine meta-gates always run.
set -u
cd "$(dirname "$0")/.."

E2E=false
[ "${1:-}" = "--e2e" ] && E2E=true

FAILED=0
step() {
  local name="$1"; shift
  echo ""
  echo "──── verify: $name ────"
  if "$@"; then
    echo "──── $name: OK"
  else
    echo "──── $name: FAILED (exit $?)"
    FAILED=1
  fi
}

has_pkg_script() {
  [ -f package.json ] && node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null
}

# Template mode (no product code yet) tolerates missing stack scripts.
# Product mode (src/ exists) treats a missing test or lint script as a FAILURE:
# an autonomous factory must not be able to "pass" by never defining its gates.
PRODUCT_MODE=false
[ -d src ] && PRODUCT_MODE=true

# ---- product/stack gates (auto-detected) ----
if [ -f package.json ]; then
  if has_pkg_script typecheck; then step "typecheck" npm run --silent typecheck
  elif [ -f tsconfig.json ]; then step "typecheck" npx tsc --noEmit; fi

  if has_pkg_script lint; then step "lint" npm run --silent lint
  elif $PRODUCT_MODE; then echo "──── lint: FAILED (product code exists but no lint script is defined)"; FAILED=1
  else echo "(no lint script — template mode skip; becomes a hard gate once src/ exists)"; fi

  if has_pkg_script test; then step "unit tests" npm run --silent test
  elif $PRODUCT_MODE; then echo "──── unit tests: FAILED (product code exists but no test script is defined)"; FAILED=1
  else echo "(no test script — template mode skip; becomes a hard gate once src/ exists)"; fi

  if has_pkg_script build; then step "build" npm run --silent build
  else echo "(no build script — skipping)"; fi
fi
if [ -f Cargo.toml ]; then
  step "cargo check" cargo check --quiet
  step "cargo test" cargo test --quiet
fi
if [ -f pyproject.toml ] && command -v pytest >/dev/null 2>&1; then
  step "pytest" pytest -q
fi

# ---- engine meta-gates (always) ----
step "features.json schema + invariants" npx ts-node scripts/update-state.ts --validate
step "assertion shield" npx ts-node scripts/assertion-shield.ts
step "hook contract tests" bash scripts/test-hooks.sh

# ---- E2E (opt-in) ----
if $E2E; then
  if has_pkg_script e2e; then
    step "seed" npx ts-node scripts/seed.ts
    step "e2e" npm run --silent e2e
  else
    echo "(--e2e requested but no e2e script defined — counting as failure so it can't be silently skipped)"
    FAILED=1
  fi
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  # Run signature for audit (ties an evidence log to a commit; CI re-running the
  # real gate on every PR is the hard backstop against forged logs)
  echo "VERIFY-COMMIT: $(git rev-parse HEAD 2>/dev/null || echo no-git) @ $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "VERIFY: PASS (exit 0)"   # update-state.ts --passes parses this exact line
  exit 0
else
  echo "VERIFY: FAIL"
  exit 1
fi
