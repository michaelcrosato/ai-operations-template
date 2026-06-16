# Security Policy

## What this repository is

`ai-operations-template` is a **public reference template** for running autonomous AI coding agents under strict, file-based guardrails. It ships an engine (gates, hooks, a state machine) plus a thin demo product ("ForgeOps"). The demo runs on **synthetic seed data only** — there is no production backend, no real customer data, and no live secrets in this repository.

## Reporting a vulnerability

**Please report security issues privately. Do not open a public issue for a vulnerability.**

Use GitHub's private reporting: go to the repository's **Security** tab → **Report a vulnerability** (GitHub Security Advisories). This routes the report privately to the maintainer.

If you cannot use that channel, you may contact the maintainer through their GitHub profile (`@michaelcrosato`) and ask for a private channel before sharing details.

We aim to acknowledge a report within **5 business days** and to agree on a disclosure timeline with the reporter. Please give us a reasonable window to ship a fix before any public disclosure.

## Scope (as of 2026-06-14)

### In scope
- The guardrail layer: hooks under `.claude/hooks/**`, the verification gate `scripts/verify.sh`, the assertion shield `scripts/assertion-shield.ts`, and the state writer `scripts/update-state.ts`.
- CI/automation workflows under `.github/workflows/**` (privilege escalation, trust-widening, secret exposure).
- Anything that lets an agent read secrets, escape its authorized paths, weaken tests undetected, or forge a passing verification.

### Out of scope
- The demo product surface (`app/**`, `components/**`, `lib/**`) treated as a security target — it is a synthetic-data demo with no real users, billing, or backend. Logic bugs there are normal issues, not vulnerabilities.
- The deliberately simplified example modules under `src/forge/**` (e.g. the demo RBAC) — these are loop fixtures, not a production access-control system. See `README.md` / `AI_OPERATIONS_PLAN.md`.
- Findings that require already having write access to the repository or the operator's machine.
- Dependency advisories already tracked by Dependabot (these are handled through the normal update flow).

## Supported versions

This is a rolling template; only the latest `develop` (and the most recent tag, currently `v0.1.0`) is supported. There are no backported security releases for older tags.

## Our own safeguards

- Secrets are never committed; `.env*` is unreadable to agents by policy and by hook.
- CI runs a dependency vulnerability audit (`npm audit --omit=dev --audit-level=high`), a secret-shaped-string scan, and a trust-widening tripwire on every PR.
- Dependabot alerts, Dependabot security updates, secret scanning, and push protection are enabled on this repository.
