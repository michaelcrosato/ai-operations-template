#!/usr/bin/env bash
# scripts/capture.sh (F-EC1): sandbox-safe evidence capture — thin wrapper around capture.mjs.
# Captures a command's stdout+stderr to roadmap/evidence/<F-XXXX>/<name>.log with a provenance
# header and propagates the command's exit code, WITHOUT any shell redirection (the sandbox can
# block `> file`; capturing programmatically is why an agent never has to hand-transcribe a log).
#
# Usage: bash scripts/capture.sh <F-XXXX> <name> -- <cmd> [args...]
set -u
exec node "$(dirname "$0")/capture.mjs" "$@"
