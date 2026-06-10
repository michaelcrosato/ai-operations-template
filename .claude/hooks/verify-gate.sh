#!/usr/bin/env bash
# PreToolUse[Edit|Write] gate: roadmap/features.json is never hand-edited.
# All mutations go through scripts/update-state.ts, which enforces the
# default-FAIL evidence contract (AI_OPERATIONS_PLAN §4.2, §6.3).
set -u

INPUT="$(cat)"

# Parse file_path precisely (jq, else node). Matching the raw JSON would
# false-positive on any file whose CONTENT mentions features.json.
if command -v jq >/dev/null 2>&1; then
  FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
elif command -v node >/dev/null 2>&1; then
  FILE="$(printf '%s' "$INPUT" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).tool_input?.file_path??"")}catch{}})' 2>/dev/null)"
else
  FILE=""
fi

case "$FILE" in
  *roadmap/features.json*|*roadmap\\features.json*)
    echo "BLOCKED: direct edits to roadmap/features.json are prohibited. Use: npx ts-node scripts/update-state.ts (--add | --status | --evidence | --attempt | --passes). It validates the schema and the evidence contract; hand edits corrupt the backlog." >&2
    exit 2
    ;;
esac

exit 0
