'use strict';

/**
 * F-0021: Pure userCanEdit predicate (CJS, zero-dep) for direct unit testing.
 * owner/admin/editor -> true (can mutate graph); viewer -> false (read-only).
 * Mirrors the canEdit policy in lib/seed.ts used by the demo canvas.
 *
 * @param {string} role - 'owner' | 'admin' | 'editor' | 'viewer'
 * @returns {boolean}
 */
function userCanEdit(role) {
  const r = String(role || '').toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'editor';
}

module.exports = { userCanEdit };
