/**
 * RBAC simulation (F-0021: generalized role→permission model).
 * Zero-dependency TypeScript module exporting check(principal, res, act): 'allow' | 'deny'.
 *
 * Role policy:
 *   owner  — allow all on all resources
 *   admin  — allow all on graph/logs/run/template; deny org/billing-type resources
 *   editor — read non-billing resources + mutate graph/template; deny org/billing
 *            entirely (incl. read, so editor never exceeds admin) and run/manage
 *   viewer — allow read only; deny every mutation
 *
 * Input contract (fail-CLOSED, hardened): principal/res/act are coerced to string,
 * lowercased, and trimmed, so a padded-but-valid principal resolves to its intended
 * (still correctly gated) role instead of silently default-denying, and a padded
 * resource ('billing ') can no longer slip past the exact-match org/billing denial.
 * For the bounded roles (editor/viewer) the action must be an explicit KNOWN action —
 * an empty or unrecognized action is denied, never treated as an implicit read/mutation.
 * Backward-compatible: every existing rbac.test.ts assertion (all known actions) holds.
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

// The closed action vocabulary. Used to make the bounded roles (editor/viewer)
// fail-CLOSED: an action outside this set — the empty string included — is denied
// outright rather than falling through to an implicit read or mutation grant. 'read'
// is the only read action; everything else is a mutation/run-control verb. Run-control
// actions are folded in from RUN_MANAGE_ACTIONS so the two sets never drift. Registering
// a NEW action type means adding it here (and covering it with a test), by design.
const KNOWN_ACTIONS = new Set(['read', 'edit', 'create', 'update', 'delete', 'export', ...RUN_MANAGE_ACTIONS]);

export function check(principal: string, res: string, act: string): 'allow' | 'deny' {
  // Coerce, lowercase, AND trim (fail-CLOSED normalization): padding must not change a
  // decision — it neither default-denies an otherwise-valid principal nor lets a padded
  // resource ('billing ') bypass the exact-match org/billing denial below.
  const p = String(principal || '').toLowerCase().trim();
  const r = String(res || '').toLowerCase().trim();
  const a = String(act || '').toLowerCase().trim();

  if (p === 'owner') return 'allow';

  if (p === 'admin') {
    if (ORG_BILLING_RESOURCES.has(r)) return 'deny';
    return 'allow';
  }

  if (p === 'editor') {
    // org/billing is owner-only: admin is denied it entirely, so editor (lower
    // privilege) must be too — INCLUDING read. This check is first so a read
    // never escalates past admin (monotonicity: editor 'allow' ⟹ admin 'allow').
    if (ORG_BILLING_RESOURCES.has(r)) return 'deny';
    if (a === 'read') return 'allow'; // editor can read non-billing resources
    // Fail-CLOSED on the action axis: an empty or unrecognized action is NOT an implicit
    // grant. Previously '' read-defaulted, and an unknown verb slipped through below as a
    // graph/template mutation; now an explicit known action is required.
    if (!KNOWN_ACTIONS.has(a)) return 'deny';
    if (RUN_MANAGE_ACTIONS.has(a)) return 'deny'; // no run-control/manage
    if (EDITOR_MUTABLE_RESOURCES.has(r)) return 'allow'; // mutate only graph/template
    return 'deny'; // default-deny resources outside editor scope
  }

  if (p === 'viewer') {
    if (ORG_BILLING_RESOURCES.has(r)) return 'deny'; // org/billing is owner-only (stay monotonic with admin/editor)
    if (a === 'read') return 'allow';
    // Fail-CLOSED: empty/unknown/any non-read action is denied (previously '' read-defaulted).
    return 'deny'; // mutation denied; 403/404 semantics per security.md (two-principal tests)
  }

  return 'deny';
}
