'use strict';

/**
 * RBAC simulation (F-0021: generalized role→permission model).
 * Zero-dependency CommonJS module exporting check(principal, res, act): 'allow' | 'deny'.
 *
 * Role policy:
 *   owner  — allow all on all resources
 *   admin  — allow all on graph/logs/run/template; deny org/billing-type resources
 *   editor — allow read + mutate graph/template; deny run-control/manage actions
 *   viewer — allow read only; deny every mutation
 *
 * Backward-compatible: all existing rbac.test.js assertions remain true.
 * Callers surface denials as 403/404 per security.md (two-principal tests).
 */

// Resources that even admin cannot manage
const ORG_BILLING_RESOURCES = new Set(['org', 'billing', 'subscription', 'seat', 'plan']);

// Run-control / management actions that editor cannot perform
const RUN_MANAGE_ACTIONS = new Set(['run', 'deploy', 'manage', 'admin', 'delete-workspace']);

// Resources an editor may MUTATE (read is allowed everywhere for editor). An editor
// must never exceed admin's reach, so anything outside this set is default-denied —
// in particular the ORG_BILLING_RESOURCES that admin itself cannot touch.
const EDITOR_MUTABLE_RESOURCES = new Set(['graph', 'template']);

function check(principal, res, act) {
  const p = String(principal || '').toLowerCase();
  const r = String(res || '').toLowerCase();
  const a = String(act || '').toLowerCase();

  if (p === 'owner') return 'allow';

  if (p === 'admin') {
    if (ORG_BILLING_RESOURCES.has(r)) return 'deny';
    return 'allow';
  }

  if (p === 'editor') {
    if (a === 'read' || a === '') return 'allow'; // editor can read anything
    if (RUN_MANAGE_ACTIONS.has(a)) return 'deny'; // no run-control/manage
    if (ORG_BILLING_RESOURCES.has(r)) return 'deny'; // never exceed admin on org/billing
    if (EDITOR_MUTABLE_RESOURCES.has(r)) return 'allow'; // mutate only graph/template
    return 'deny'; // default-deny resources outside editor scope
  }

  if (p === 'viewer') {
    if (a === 'read' || a === '') return 'allow';
    return 'deny'; // mutation denied; 403/404 semantics per security.md (two-principal tests)
  }

  return 'deny';
}

module.exports = { check };

if (require.main === module) {
  const out = {
    ownerAll: check('owner', 'graph', 'export'),
    viewerMut: check('viewer', 'graph', 'edit'),
    viewerRead: check('viewer', 'graph', 'read')
  };
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exitCode = 0;
}
