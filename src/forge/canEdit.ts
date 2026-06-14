/**
 * F-0021: Pure userCanEdit predicate (TypeScript, zero-dep) for direct unit testing.
 * owner/admin/editor -> true (can mutate graph); viewer -> false (read-only).
 * Mirrors the canEdit policy in lib/seed.ts used by the demo canvas.
 */
export function userCanEdit(role: string): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'editor';
}
