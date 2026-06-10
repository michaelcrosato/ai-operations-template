# Progress Log

> Newest entry first. Each session **prepends** a block: date, feature id, what was done, what was verified (evidence paths), surprises, exact next step. The SessionStart hook injects the top ~50 lines into every new session.

---

## 2026-06-10 — F-0006 — External-review remediation (nine verified defects)

**Done:** Fixed all nine defects from the verified external review: assertion-shield now scans staged changes (`--cached`) and catches wholesale test-file deletions (`--- a/` parsing), and uses execFileSync (security-guidance plugin finding); `update-state.ts --validate` deep-audits evidence of every passing feature and rejects done-without-passes and dependency cycles; `security-patterns.json` rewritten to the real plugin schema (was silently inert); guard-bash blocks refspec (`HEAD:refs/heads/main`) and flag-separated (`git -C . push`) variants; promotion-PR identity documented (App/bot authors it — operator can't approve own PRs); dependabot.yml shipped; format hook + path guard formally deferred (F-0007); verify.sh hard-fails missing test/lint once `src/` exists; verify-rules.ts no longer emits false-positive warnings; OPERATOR_GUIDE recovery is now zero-CLI (@claude comment or GitHub Revert button). Plan security citations corrected to GHSA-8q5r-mmjf-575q + Claude Code 2.1.128, verified 2026-06-10 against the GitHub advisory API and vendor docs.

**Verified:** `bash scripts/verify.sh` green with expanded contract suite (63 tests) — evidence `roadmap/evidence/F-0006/verify.log`. Review cycle (attempts: 1): evaluator PASS; security reviewer **BLOCKED** on an empirically confirmed gap — `git push origin +main` (+refspec force syntax) evaded both push guards — plus long-flag variants (`--work-tree /x push`); fixed, six contract tests added, re-review **APPROVE** (PR #3).

**Surprises:** ① the security-guidance plugin (fixed this session) immediately flagged a real issue in the very file being edited; ② the re-reviewer's own test commands were blocked by the live guard hook — the layers are compounding.

**Next step:** F-0002 demo loop; F-0004 operator setup (Q-0001); F-0007 path-guard design.

---

## 2026-06-09 — F-0005 — Philosophy + downtime protocol

**Done:** Operator stated the engine's governing philosophy (six principles: frontier-only freshness, full AFK autonomy, non-technical operator, token-efficient orchestrator, self-improving/self-fixing, servant leadership + axe-sharpening). Codified it three ways: README "Philosophy" section (operator-facing), plan P6 + new §5.5 "Downtime & idle protocol" (mechanics: sentinel scan → risk research → pre-briefs → kaizen → spot checks, capped at ~30% session budget), and a new `/downtime` skill wired into `/work` SELECT and CLAUDE.md. `/work` BRIEF now consumes pre-written briefs from `roadmap/briefs/`.

**Verified:** `bash scripts/verify.sh` green — evidence `roadmap/evidence/F-0005/verify.log`; fresh-context evaluator PASS (see PR #2).

**Surprises:** none — pure docs/skills feature; security review skipped per sensitivity rule (DECISIONS).

**Next step:** unchanged — F-0002 demo loop, F-0004 operator setup (Q-0001).

---

## 2026-06-09 — F-0001 — Factory bootstrap (Phase 0)

**Done:** Repo git-initialized with `develop` as default branch; pushed to github.com/michaelcrosato/ai-operations-template (private, marked as GitHub template). Reviewed repo against blueprint — found the control plane ~75% missing (no agents/skills/hooks/CI/state files; CLAUDE.md referenced nonexistent scripts). Built Phase 0 on `feat/F-0001-build-the-factory`: roadmap state files, package.json + tsconfig, model-policy.json, 5 sub-agents, 6 skills, 3 path-scoped rules, 4 hooks wired into settings.json, init.sh / verify.sh / update-state.ts / seed.ts, hardened assertion-shield (CI ignores bypass env), CI workflows.

**Verified:** `bash scripts/verify.sh` green — typecheck + state validation + assertion shield + **45/45 hook contract tests** (F-0003). Evidence: `roadmap/evidence/F-0001/verify.log`, `roadmap/evidence/F-0003/contract-tests.log`. Two parallel fresh-context review agents ran pre-merge: evaluator (5 findings, all fixed: uncommitted gate fix, stale evidence, `.gitignore *.log` swallowed all evidence, missing exec bits, Stop-only registration) and security reviewer (APPROVE; path-normalization bypass fixed, claude.yml SHA-pinned, accepted risks logged in DECISIONS).

**Surprises:** ① `.claude/settings.json` permission rules were bare strings — silently skipped; doctor's suggested fix was wrong (no `Npm` tool exists). ② Write tool emitted CRLF on Windows, which silently breaks bash hooks — `.gitattributes` now pins LF. ③ `.gitignore`'s `*.log` was ignoring the entire evidence directory — the engine's core contract was unshippable until contract tests + evaluator caught it. ④ In PowerShell, `bash` resolves to WSL bash (no node) — hook tests must run under Git Bash.

**Next step:** Run F-0002 — a deliberately trivial demo feature through the full SELECT→BRIEF→BUILD→VERIFY→JUDGE→SHIP loop — to prove the engine end-to-end before real work. Operator still owes the one-time setup (Q-0001).
