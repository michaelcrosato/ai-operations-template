/**
 * seed.ts — deterministic synthetic seed data for manual QA and E2E runs (plan §3, §7.1).
 *
 * TEMPLATE STUB: the product defines what to seed. Rules that survive any stack:
 *  - Synthetic data only — never copies of live customer data (compliance boundary, plan §6.2).
 *  - Deterministic — same input every run, so QA scripts and E2E assertions can use exact values.
 *  - Idempotent — re-running resets to the same state; safe on dev/ephemeral databases only.
 *  - Refuses production — bail if the connection target looks like prod.
 */

const target = process.env.DATABASE_URL ?? '';
if (/prod/i.test(target)) {
  console.error('[seed] REFUSING: connection string looks like production.');
  process.exit(1);
}

console.log('[seed] template stub — no product schema yet. Define seed fixtures when the data layer lands (Phase 2).');
process.exit(0);
