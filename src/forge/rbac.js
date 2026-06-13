'use strict';

/**
 * RBAC simulation (F-0020: ForgeOps RBAC + export slice).
 * Zero-dependency CommonJS module exporting check(principal, res, act): 'allow' | 'deny'.
 * Owner principal allows all actions.
 * Viewer principal denies mutations (non-read actions); callers surface as 403/404 per security.md.
 * Matches src/health.js style (module.exports + CLI-if-main, stdout JSON, exit 0).
 */

function check(principal, res, act) {
  const p = String(principal || '').toLowerCase();
  const a = String(act || '').toLowerCase();
  if (p === 'owner') return 'allow';
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
