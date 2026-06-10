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

# ---- product/stack gates (auto-detected) ----
if [ -f package.json ]; then
  if has_pkg_script typecheck; then step "typecheck" npm run --silent typecheck
  elif [ -f tsconfig.json ]; then step "typecheck" npx tsc --noEmit; fi

  if has_pkg_script lint; then step "lint" npm run --silent lint
  else echo "(no lint script — skipping; add one when the product stack lands)"; fi

  if has_pkg_script test; then step "unit tests" npm run --silent test
  else echo "(no test script — skipping; product features REQUIRE tests, see CLAUDE.md)"; fi

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
