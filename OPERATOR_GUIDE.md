# Operator Guide — quick reference

You do not need to run commands or read code. This page is a cheat sheet for the day-to-day. For the full picture of how the daily routine, status reports, and PR reviews work, see the operations plan's Human Interface section — ask an agent to "explain the human interface section in plain English" if you want it read aloud to you.

> **Heads up:** some things below (a staging preview link, nightly automatic runs) only work once your product has those set up. Ask an agent if you're not sure they're wired up yet.

---

## The three places you look

1. **GitHub** — edit your wish list and answer any open questions, and review/merge pull requests.
2. **Staging preview link** — click through and try out what's new, using safe practice data.
3. **Claude Code (web or app)** — start a work session by typing "Continue the roadmap," or let it run automatically overnight.

## Morning checklist (5–10 min)

1. Read the status update to see what shipped, what's in progress, and what's stuck.
2. Reorder or add to your wish list if priorities changed.
3. Answer any open questions in plain English.
4. If nothing runs automatically yet, start a session by typing "Continue the roadmap."

## Evening / QA checklist (10 min)

1. Open the pull request for the newest work and click the preview link.
2. Follow the step-by-step try-it-out instructions.
3. Works? Approve and merge. Broken? Leave a plain-English comment describing what went wrong — it will be picked up and fixed automatically.

## Kill switches — stop work immediately

- Click "Stop" in the app or on your phone.
- Leave a comment telling the agents to stop.
- Create a blank file to trigger an emergency stop (an agent can do this for you if you just say "stop everything").

## Undo a bad release

Ask the agents to restore the last working version and explain what went wrong in plain English, or use the one-click "undo" button on the pull request that caused the problem.

---

*Where things live: the full model is in `AI_OPERATIONS_PLAN.md` §8.*
