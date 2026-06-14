/**
 * F-0021: Pure RBAC helper predicates for the demo canvas.
 * Zero runtime dependencies — safe to import from any component or test.
 *
 * These mirror the role policy in src/forge/rbac.js:
 *   owner/admin/editor → canEdit = true
 *   viewer             → canEdit = false (read-only; mutation attempts are visible-rejected)
 */

export type DemoRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Returns true if the given role is permitted to mutate graph nodes/edges/properties.
 * viewer is strictly read-only per F-0021 RBAC policy.
 */
export function userCanEdit(role: DemoRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}

/**
 * Returns true if the given role is permitted to trigger/pause/intervene runs.
 * viewer cannot intervene.
 */
export function userCanIntervene(role: DemoRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor';
}
