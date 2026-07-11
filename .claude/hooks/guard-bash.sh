#!/usr/bin/env bash
# PreToolUse[Bash] guard: blocks forbidden commands (AI_OPERATIONS_PLAN §6.2/§6.3).
# Exit 2 = block (stderr is shown to the agent). Exit 0 = allow.
set -u

INPUT="$(cat)"

# Emergency kill switch: a repo-root AGENT_STOP file halts all shell activity.
if [ -f "${CLAUDE_PROJECT_DIR:-.}/AGENT_STOP" ]; then
  echo "BLOCKED: AGENT_STOP file present. The operator has halted all work. Commit nothing further; end the session cleanly." >&2
  exit 2
fi

# Extract the command precisely (jq, else node). Matching the raw JSON would
# false-positive on commands whose arguments merely mention a pattern.
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
elif command -v node >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).tool_input?.command??"")}catch{}})' 2>/dev/null)"
else
  CMD="$INPUT"
fi
[ -z "$CMD" ] && exit 0

block() { echo "BLOCKED by guard-bash.sh: $1" >&2; exit 2; }

# Git push policy is a strict allowlist, not a shell parser. Any detected push is
# blocked unless the ENTIRE command is one canonical, single-line operation to
# an explicit short-lived branch (or an explicit tag). This fails closed on
# wrappers, redirections, comments, command chains, force/broad modes, implicit
# upstreams, dynamic refspecs, and option grammars we have not reviewed.
# Shell line continuations are joined first; quotes and remaining backslash
# escapes are then removed only in this non-executing comparison copy. The
# command itself is never evaluated here.
PUSH_SCAN_CMD="${CMD//$'\\\r\n'/}"
PUSH_SCAN_CMD="${PUSH_SCAN_CMD//$'\\\n'/}"
PUSH_SCAN_CMD="$(printf '%s' "$PUSH_SCAN_CMD" | tr -d "\"'" | tr -d "\\\\")"
PUSH_DETECT_CMD="$(printf '%s' "$PUSH_SCAN_CMD" | tr '\r\n' '  ')"
GIT_PUSH_ANY='(^|[[:space:];&|()])[^[:space:];&|()]*git(\.exe)?([[:space:]]+[^[:space:];&|()<>#]+)*[[:space:]]+push([[:space:];&|()<>#]|$)'

# If shell expansion is being used anywhere in a push-shaped Git command, its
# executable/subcommand/destination cannot be proven literal. Block before the
# ordinary detector so `$(printf git) push` and `git${IFS}push...` fail closed.
if printf '%s\n' "$PUSH_DETECT_CMD" | grep -qi 'git' &&
   printf '%s\n' "$PUSH_DETECT_CMD" | grep -qi 'push' &&
   printf '%s\n' "$CMD" | grep -qE '(\$|`)'; then
  block "dynamic construction of a git push command is prohibited; use one canonical literal command."
fi

if printf '%s\n' "$PUSH_DETECT_CMD" | grep -qiE "$GIT_PUSH_ANY"; then
  SAFE_PUSH=false
  case "$PUSH_SCAN_CMD" in
    *$'\n'*|*$'\r'*|*';'*|*'&'*|*'|'*|*'('*|*')'*|*'<'*|*'>'*|*'#'*|*'`'*|*'$'*|*'{'*|*'}'*|*'*'*|*'?'*|*'['*) ;;
    *)
      SAFE_TOKEN='[^[:space:]]+'
      SAFE_GIT="git(([[:space:]]+-C[[:space:]]+${SAFE_TOKEN})|([[:space:]]+-c[[:space:]]+${SAFE_TOKEN})|([[:space:]]+--(git-dir|work-tree|namespace|exec-path)(=${SAFE_TOKEN}|[[:space:]]+${SAFE_TOKEN})))*[[:space:]]+push"
      SAFE_BRANCH='(feat|fix|chore|claude|codex|dependabot)/[A-Za-z0-9._/-]+'
      SAFE_TAG='refs/tags/[A-Za-z0-9._/-]+'
      if printf '%s\n' "$PUSH_SCAN_CMD" | grep -qE "^${SAFE_GIT}([[:space:]]+(-u|--set-upstream))?[[:space:]]+origin[[:space:]]+(HEAD:|@:)?${SAFE_BRANCH}$" ||
         printf '%s\n' "$PUSH_SCAN_CMD" | grep -qE "^${SAFE_GIT}[[:space:]]+origin[[:space:]]+--delete[[:space:]]+${SAFE_BRANCH}$" ||
         printf '%s\n' "$PUSH_SCAN_CMD" | grep -qE "^${SAFE_GIT}[[:space:]]+--delete[[:space:]]+origin[[:space:]]+${SAFE_BRANCH}$" ||
         printf '%s\n' "$PUSH_SCAN_CMD" | grep -qE "^${SAFE_GIT}[[:space:]]+origin[[:space:]]+:${SAFE_BRANCH}$" ||
         printf '%s\n' "$PUSH_SCAN_CMD" | grep -qE "^${SAFE_GIT}[[:space:]]+origin[[:space:]]+${SAFE_TAG}(:${SAFE_TAG})?$"; then
        SAFE_PUSH=true
      fi
      ;;
  esac
  [ "$SAFE_PUSH" = true ] || block "git push is allowed only as one canonical command to an explicit short-lived branch or tag; direct/implicit/force/wrapped pushes are prohibited."
fi

# Destructive filesystem operations outside temp
# shellcheck disable=SC2016  # pattern matches a literal dollar (HOME) — no expansion intended
echo "$CMD" | grep -qE 'rm[[:space:]]+-[a-zA-Z]*[rR][a-zA-Z]*[fF]?[a-zA-Z]*[[:space:]]+("?/([a-zA-Z]|$)|~|\$HOME)' \
  && block "recursive deletion of home/root paths is prohibited."

# Secrets — bash/Unix forms
echo "$CMD" | grep -qE '(cat|less|more|head|tail|grep|awk|sed|type|strings)[[:space:]][^|;&]*\.env' \
  && block "reading .env files is prohibited (secrets boundary, CLAUDE.md §6)."

# Secrets — PowerShell Get-Content / gc / Get-ChildItem on .env* files.
# Matches ".env", ".env.local", ".env.production", etc. as a whole filename token
# (requires .env followed by end-of-token or non-alpha). Does NOT match ".environment".
# shellcheck disable=SC2016  # -i used deliberately; no variable expansion intended here
echo "$CMD" | grep -qiE '(Get-Content|gc|Get-ChildItem|gci)[[:space:]][^|;&]*\.env([^A-Za-z]|$)' \
  && block "reading .env files via PowerShell Get-Content/gc/Get-ChildItem is prohibited (secrets boundary, CLAUDE.md §6)."

# Secrets — .NET [System.IO.File] static read methods on .env* files
echo "$CMD" | grep -qiE '\[System\.IO\.File\]::ReadAll(Text|Lines|Bytes)[^|;&]*\.env([^A-Za-z]|$)' \
  && block "reading .env files via [System.IO.File]::ReadAll* is prohibited (secrets boundary, CLAUDE.md §6)."

# Secrets — Unix binary/dump utilities on .env* files (xxd, od, dd if=, base64, nl, cut)
echo "$CMD" | grep -qE '(xxd|od|base64|nl|cut)[[:space:]][^|;&]*\.env([^A-Za-z]|$)' \
  && block "reading .env files via binary/dump utilities is prohibited (secrets boundary, CLAUDE.md §6)."
echo "$CMD" | grep -qE 'dd[[:space:]]+if=\.env([^A-Za-z]|$)' \
  && block "reading .env files via dd is prohibited (secrets boundary, CLAUDE.md §6)."

# Secrets — shell input-redirection of .env* files  (< .env  or  < .env.local  etc.)
echo "$CMD" | grep -qE '<[[:space:]]*\.env([^A-Za-z]|$)' \
  && block "input-redirecting .env files is prohibited (secrets boundary, CLAUDE.md §6)."

# Pipe-to-shell
echo "$CMD" | grep -qE '(curl|wget)[^|;&]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|da)?sh' \
  && block "piping downloads to a shell is prohibited; download, inspect, then run."

# Package publishing
echo "$CMD" | grep -qE '(npm|pnpm|yarn)[[:space:]]+publish' \
  && block "package publishing is prohibited."

# Self-bypass of the assertion shield — bash form
echo "$CMD" | grep -q 'ASSERTION_SHIELD_BYPASS' \
  && block "setting ASSERTION_SHIELD_BYPASS is prohibited for agents; restore the assertions instead."

# Destructive PowerShell Remove-Item with -Recurse/-r targeting root or home paths.
# Only blocks when BOTH a recursive flag AND a sensitive root target are present.
# Sensitive targets: bare / (Unix root), /letter (absolute Unix), C:\ (Windows root),
# ~ (home shorthand), $HOME, $env:USERPROFILE, $env:HOME.
# Benign Remove-Item (e.g. "Remove-Item tmp/foo" or "Remove-Item -Recurse node_modules") is NOT matched.
# shellcheck disable=SC2016  # patterns match literal $HOME/$env: tokens; no expansion intended
echo "$CMD" | grep -qiE 'Remove-Item[^|;&]*(-Recurse|-r[[:space:]])[^|;&]*[[:space:]]"?(/([a-zA-Z]|$)|C:\\|~|\$HOME|\$env:(USERPROFILE|HOME))' \
  && block "recursive PowerShell Remove-Item on root/home paths is prohibited."
# shellcheck disable=SC2016  # patterns match literal $HOME/$env: tokens; no expansion intended
echo "$CMD" | grep -qiE 'Remove-Item[^|;&]*[[:space:]]"?(/([a-zA-Z]|$)|C:\\|~|\$HOME|\$env:(USERPROFILE|HOME))[^|;&]*(-Recurse|-r[[:space:]])' \
  && block "recursive PowerShell Remove-Item on root/home paths is prohibited."

# Exfil — PowerShell Invoke-RestMethod / Invoke-WebRequest with upload indicators
# Blocks -Method Post/-Body/-InFile combos. Plain GET calls are not matched.
echo "$CMD" | grep -qiE '(Invoke-RestMethod|irm|Invoke-WebRequest|iwr|curl\.exe|wget\.exe)[^|;&]*(-Method[[:space:]]+(Post|Put)|-Body[[:space:]]|-InFile[[:space:]])' \
  && block "PowerShell exfil-shaped upload (Invoke-RestMethod/Invoke-WebRequest -Method Post/-Body/-InFile) is prohibited."

# Exfil-shaped uploads (F-0009, mirrors Anthropic's post-incident gh-wrapper fix):
# block ONLY when an upload-capable invocation carries secret-shaped content or
# a secret env var — plain gh api reads/writes of normal data stay allowed.
if echo "$CMD" | grep -qE '(curl|wget|gh[[:space:]]+api)[^|;&]*([[:space:]]-(d|F|T)[[:space:]]|--data|--form|--upload-file|--post-data|--post-file|--body-data|--body-file|-X[[:space:]]*(POST|PUT)|--method[[:space:]]*(POST|PUT)|-f[[:space:]]+[A-Za-z_]+=)'; then
  # shellcheck disable=SC2016  # patterns match literal $VAR references; no expansion intended
  echo "$CMD" | grep -qE '(sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{8,}|\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{8,}|BEGIN[[:space:]]+(RSA|EC|OPENSSH)?[[:space:]]*PRIVATE[[:space:]]+KEY|\$\{?(ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|GITHUB_TOKEN|GH_TOKEN)\}?)' \
    && block "exfil-shaped upload: secret-shaped content in a POST/upload command is prohibited (plan §7.2)."
fi

# Bypass env var — PowerShell $env: assignment form
# shellcheck disable=SC2016  # matches literal $env: syntax; no expansion intended
echo "$CMD" | grep -q '$env:ASSERTION_SHIELD_BYPASS' \
  && block "setting ASSERTION_SHIELD_BYPASS via PowerShell \$env: is prohibited for agents; restore the assertions instead."

exit 0
