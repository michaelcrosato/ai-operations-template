# Progress Log

> Newest entry first. Each session **prepends** a block: date, feature id, what was done, what was verified (evidence paths), surprises, exact next step. The SessionStart hook injects the top ~50 lines into every new session.

---

## 2026-06-09 — F-0001 — Factory bootstrap (Phase 0)

**Done:** Repo git-initialized with `develop` as default branch; pushed to github.com/michaelcrosato/ai-operations-template (private, marked as GitHub template). Reviewed repo against blueprint — found the control plane ~75% missing (no agents/skills/hooks/CI/state files; CLAUDE.md referenced nonexistent scripts). Built Phase 0 on `feat/F-0001-build-the-factory`: roadmap state files, package.json + tsconfig, model-policy.json, 5 sub-agents, 6 skills, 3 path-scoped rules, 4 hooks wired into settings.json, init.sh / verify.sh / update-state.ts / seed.ts, hardened assertion-shield (CI ignores bypass env), CI workflows.

**Verified:** `bash scripts/verify.sh` green (typecheck + state validation + shield) — log at `roadmap/evidence/F-0001/verify.log`.

**Surprises:** `.claude/settings.json` permission rules were bare strings (`"npm"`) — silently skipped by Claude Code; fixed to `Bash(...)` syntax. Doctor's auto-suggestion (capitalize to `"Npm"`) was wrong and would have left rules dead.

**Next step:** Merge PR #1 to develop, then run F-0002 (trivial demo feature through the full loop) to prove the engine end-to-end.
