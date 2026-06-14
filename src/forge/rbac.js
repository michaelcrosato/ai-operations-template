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
    if (RUN_MANAGE_ACTIONS.has(a)) return 'deny';
    // editors can read and mutate graph/template resources
    return 'allow';
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
