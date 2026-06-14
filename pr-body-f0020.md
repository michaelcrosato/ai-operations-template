## What this does
ForgeOps RBAC simulation (owner full edit/run/export, viewer read-only with 403/404 deny on mutations per security.md two-principal rule) + export/deploy scaffold foundations (portable graph.json + minimal Dockerfile with node base/COPY/healthcheck + docker-compose with DEMO_MODE/health). Slice 2 after F-0019 promptToGraph core. Delivers real src/forge/ under F-0007 per-feature guard (no hand edits, no drift). Un-ghosts more of the ForgeOps product vision for visual canvas later. All states and ACs covered; verify green with marker.

## How to see it (click-by-click)
1. Open src/forge/rbac.js and rbac.test.js — see check(principal, _res, act) with owner allow-all, viewer deny on non-read; tests use owner (allowed) + viewer (deny 403/404 semantics) per security.md.
2. Run `node src/forge/rbac.js` — prints JSON with ownerAll: "allow", viewerMut: "deny", viewerRead: "allow".
3. Open src/forge/exportArtifacts.js and .test.js — see minimalGraph, dockerfileContent, dockerComposeContent, exportArtifacts(); tests and CLI emit the 3 artifacts.
4. Run `node src/forge/exportArtifacts.js` or the test — artifacts written to roadmap/evidence/F-0020/ (graph.json, Dockerfile, docker-compose.yml).
5. Inspect the artifacts in roadmap/evidence/F-0020/ — confirm graph has nodes+edges, Dockerfile has "FROM node:20-alpine" + HEALTHCHECK, compose has "DEMO_MODE=1" + healthcheck.
6. Run `bash scripts/verify.sh` (or the Git bash equiv on Windows) — units 12/0 (new + prior), hook contracts 173/0, features validate green, full gate ends with "VERIFY: PASS (exit 0)" + marker in roadmap/evidence/F-0020/verify.log.
7. Git log on feat/F-0020 — shows delivery + hygiene (Grep-first style fixes) + RECORD block + no forbidden paths touched.
8. (After merge) The features.json has F-0020 status: done, passes: true, evidence includes the verify.log + artifacts.

## What could be risky
- Synthetic RBAC only (demo, not production auth — safe per brief).
- Minimal docker scaffold (no actual build/publish here; health is trivial exit 0).
- 4 small style fixes (templates for concat, _res) by orchestrator post-builder on authorized src/** (F-0007 guard live).
- Windows CRLF warnings on edits (normal, .gitattributes LF for sh but js ok).
- No E2E UI (this is engine slice; F-0018 blocked on E2E per frontend.md).
- PR may have no CI checks in this env (ship.sh fail-closed per doctrine, merge only green).

## Machine checks
- 12/0 unit tests (rbac 2 principals, export strings, promptToGraph deterministic + keys, health, CLIs).
- 173/0 hook contract tests (includes F-0007 per-feature authz + ship fail-closed + all prior).
- verify.log contains exact "VERIFY: PASS (exit 0)" + VERIFY-COMMIT.
- npx ts-node scripts/update-state.ts --validate : 20 features, ~18 passing (evidence re-verified).
- Edits only under authorized src/** + package (F-0007 guard not violated).
- No .env, no secrets, no prod DB, no curl|sh, no rm -rf, no assertion weaken.
- Web 4/16 xAI multi-agent (May 2026 docs) re-verified: aligns (4 quick/focused, 16 Heavy deep, shared + debate/synth; our orch/explorer/builder/fresh JUDGE + kaizen/precise/TELEMETRY + Grep-first matches).
- Git: feat/F-0020 from origin/develop hygiene, no force, rebase own only; clean tracked post commit.
- Schedulers + goal cadence + decaying eval active; no AGENT_STOP.

Closes F-0020 (and advances F-0017 slices). Operator: run the click-by-click above on the merged develop after green CI.