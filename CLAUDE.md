# Agent Constitution: <REPO_NAME>

## 1. Project Overview & Mapping
This repository is a 100% AI-coded project. AI agents write every line of code, run autonomously, and the human operator is responsible only for planning and final QA.
- **System Architecture**: Fully specified in `README.md`.
- **Operations blueprint**: Specified in `AI_OPERATIONS_PLAN.md`.
- **State & backlog files**: Located in the `roadmap/` directory.

## 2. Core Operational Commands
- **Initialize Dev Environment**: `bash scripts/init.sh`
- **Verify Codebase (standard)**: `bash scripts/verify.sh`
- **Verify Codebase (with E2E tests)**: `bash scripts/verify.sh --e2e`
- **Verify Test Assertions**: `npx ts-node scripts/assertion-shield.ts`

## 3. Session Protocol
1. **Read State**: Read the top ~50 lines of `roadmap/PROGRESS.md` and check the backlog in `roadmap/features.json`.
2. **Select Task**: Identify the highest priority feature that is pending, has fewer than 2 failed attempts, and has all dependencies resolved.
3. **Write Brief / Gather Context**: Use explorer/search tools to find relevant code patterns. Write down the brief.
4. **Implement**: Create a new branch `feat/F-XXXX` (where `XXXX` is the feature ID). Write the code and corresponding unit tests.
5. **Verify**: Run `bash scripts/verify.sh` and `npx ts-node scripts/assertion-shield.ts` to ensure all type-checks, lints, tests, and assertion checks pass.
6. **Gather Evidence**: Save logs/screenshots to `roadmap/evidence/F-XXXX/`.
7. **Evaluate**: Use the evaluator sub-agent to review the implementation and evidence against the feature's acceptance criteria.
8. **Ship**: Open a PR targeting the integration branch (`develop`). Once CI passes, merge the PR.
9. **Record Progress**: Update the status in `roadmap/features.json` via `scripts/update-state.ts`, prepend an entry to `roadmap/PROGRESS.md`, record judgment calls in `roadmap/DECISIONS.md`, and commit the changes.
10. **Adaptive Memory**: Extract rules, conventions, or lessons learned from PR reviews or test failures, and update `CLAUDE.md` or `.claude/rules/` to prevent future recurrence.

## 4. Decide-and-Document Policy
- **Minor choices**: Do not block the run to ask questions. Choose the most conventional/safe option, document it in `roadmap/DECISIONS.md`, and proceed.
- **Blockers & Escalations**: Only escalate to `roadmap/QUESTIONS.md` when the choice is expensive to reverse or directly impacts operator-level product decisions. Continue work on other features while waiting for answers.

## 5. Branch & PR Rules
- **No direct commits to stable branches**: Never touch `master` or `main` directly.
- **PR template**: Follow the operator PR description template verbatim. Ensure a click-by-click manual QA script is generated in the PR comments or body.

## 6. Prohibitions & Safety
- **No production database modification**: Direct access to production database instances is strictly prohibited.
- **No force-pushing**: Rebase locally or resolve conflicts using clean branch merges.
- **No secret/PII reading**: Reading or printing `.env` credentials, secret keys, or live customer data is prohibited.
- **No assertion deletion**: Modifying or removing test assertions to pass failing tests is strictly prohibited. Always run assertion-shield checks prior to committing.
