# Decisions Log (append-only, ADR-lite)

> One entry per autonomous judgment call: context → decision → reversible? → where it lives.

- **2026-06-09** · Bootstrap branch model → initialized repo with `develop` as the root/default branch so the constitution's "never touch master/main" rule is never violated, even at bootstrap; stable branch gets created at first promotion. Reversible (branch settings). → git history, AI_OPERATIONS_PLAN §6.4.
- **2026-06-09** · Repo visibility → **private** (safe default for an unreviewed engine); marked as GitHub *template repository* for one-click reuse. Reversible in repo settings. → github.com/michaelcrosato/ai-operations-template.
- **2026-06-09** · Permission rule `"publish"` (intent unclear) → interpreted as package-publishing ban: `Bash(npm publish*)` + `Bash(pnpm publish*)`. Reversible. → .claude/settings.json.
- **2026-06-09** · `assertion-shield` bypass env var was agent-settable (self-bypass hole) → bypass now ignored when `CI=true`, and `guard-bash.sh` denies setting it in commands. Reversible. → scripts/assertion-shield.ts, .claude/hooks/guard-bash.sh.
- **2026-06-09** · features schema lacked the `dependencies` field that CLAUDE.md's session protocol and update-state validation both reference → added optional `dependencies: string[]` (feature IDs) to features.schema.json. Reversible. → roadmap/features.schema.json.
- **2026-06-09** · Engine meta-tooling language → kept existing TypeScript (ts-node) rather than rewriting to plain JS; added package.json with pinned dev-tooling so `npx ts-node` is deterministic. Reversible. → package.json.
- **2026-06-09** · GitHub Actions pinning → pinned to major release tags (v4/v5/v1), not commit SHAs: SHA freshness can't be web-verified from this session; weekly hygiene routine owns upgrading tags→SHAs. Reversible. → .github/workflows/.
- **2026-06-09** · Added `/kaizen` skill (not in original blueprint) → operator goal explicitly requires manager-style continuous improvement ("1% better daily"); blueprint's weekly hygiene was too coarse. → .claude/skills/kaizen/.
