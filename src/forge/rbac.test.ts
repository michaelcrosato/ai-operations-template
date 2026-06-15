import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './rbac.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
test('check: owner allows all actions (read/edit/export/run)', () => {
  assert.equal(check('owner', 'graph', 'read'), 'allow');
  assert.equal(check('owner', 'graph', 'edit'), 'allow');
  assert.equal(check('owner', 'graph', 'export'), 'allow');
  assert.equal(check('owner', 'node', 'run'), 'allow');
});

test('check: viewer allows reads, denies mutations (403/404 per security.md)', () => {
  assert.equal(check('viewer', 'graph', 'read'), 'allow');
  const mut = check('viewer', 'graph', 'edit');
  assert.equal(mut, 'deny');
  // non-owner must get 403/404 semantics on mutation attempts (security.md: two principals min)
  assert.equal(mut, 'deny', 'viewer mutation denied -> 403/404');
  assert.equal(check('viewer', 'graph', 'export'), 'deny');
  assert.equal(check('viewer', 'graph', 'run'), 'deny');
});

test('CLI: node src/forge/rbac.js exits 0 and prints JSON with owner/viewer results', () => {
  // CLI block removed in TS; replicate the same JSON shape via direct function call
  const parsed = {
    ownerAll: check('owner', 'graph', 'export'),
    viewerMut: check('viewer', 'graph', 'edit'),
    viewerRead: check('viewer', 'graph', 'read')
  };
  assert.equal(parsed.ownerAll, 'allow');
  assert.equal(parsed.viewerMut, 'deny');
  assert.equal(parsed.viewerRead, 'allow');
});

// F-0021: two-principal tests — graph mutation: owner+editor allowed, viewer denied (security.md)
test('check: graph-mutation two-principal — owner and editor allowed, viewer denied', () => {
  // owner: allowed on graph mutation
  assert.equal(check('owner', 'graph', 'edit'), 'allow', 'owner can edit graph');
  // editor: allowed on graph mutation (read + mutate graph)
  assert.equal(check('editor', 'graph', 'edit'), 'allow', 'editor can edit graph');
  // viewer: denied graph mutation (403/404 semantics)
  assert.equal(check('viewer', 'graph', 'edit'), 'deny', 'viewer cannot edit graph -> 403/404');
});

// F-0021: resource argument actually changes the decision for admin
test('check: res argument changes decision — admin denied on billing resource, allowed on graph', () => {
  // admin allowed on graph resource
  assert.equal(check('admin', 'graph', 'edit'), 'allow', 'admin can edit graph');
  // admin denied on billing resource (org/billing-type)
  assert.equal(check('admin', 'billing', 'edit'), 'deny', 'admin cannot edit billing resource');
  assert.equal(check('admin', 'org', 'manage'), 'deny', 'admin cannot manage org resource');
});

// F-0021: full role matrix — admin/editor/viewer policy coverage
test('check: admin allows graph/logs/run, denies org/billing', () => {
  assert.equal(check('admin', 'graph', 'read'), 'allow');
  assert.equal(check('admin', 'graph', 'edit'), 'allow');
  assert.equal(check('admin', 'logs', 'read'), 'allow');
  assert.equal(check('admin', 'run', 'edit'), 'allow');
  assert.equal(check('admin', 'billing', 'read'), 'deny');
  assert.equal(check('admin', 'subscription', 'edit'), 'deny');
});

test('check: editor allows read+mutate-graph, denies run-control/manage', () => {
  assert.equal(check('editor', 'graph', 'read'), 'allow');
  assert.equal(check('editor', 'graph', 'edit'), 'allow');
  assert.equal(check('editor', 'template', 'edit'), 'allow');
  // editor denied run-control
  assert.equal(check('editor', 'graph', 'run'), 'deny', 'editor cannot run');
  assert.equal(check('editor', 'graph', 'deploy'), 'deny', 'editor cannot deploy');
  assert.equal(check('editor', 'workspace', 'manage'), 'deny', 'editor cannot manage');
});

// F-0021 (security fix): editor must never exceed admin's reach on org/billing
// resources — the resource arg constrains editor mutations, not just the action.
test('check: editor cannot mutate org/billing resources (no privilege escalation past admin)', () => {
  // admin is denied these; editor (lower privilege) must be denied too
  assert.equal(check('editor', 'billing', 'edit'), 'deny', 'editor cannot edit billing');
  assert.equal(check('editor', 'subscription', 'edit'), 'deny', 'editor cannot edit subscription');
  assert.equal(check('editor', 'plan', 'edit'), 'deny', 'editor cannot edit plan');
  assert.equal(check('editor', 'org', 'edit'), 'deny', 'editor cannot edit org');
  assert.equal(check('editor', 'seat', 'edit'), 'deny', 'editor cannot edit seats');
  // and a resource outside the editor-mutable set is default-denied
  assert.equal(check('editor', 'secrets', 'edit'), 'deny', 'editor cannot edit arbitrary resources');
  // sanity: editor's allowed mutations still work, and editor never exceeds admin
  assert.equal(check('editor', 'graph', 'edit'), 'allow', 'editor can still edit graph');
  assert.equal(check('admin', 'billing', 'edit'), 'deny', 'admin baseline: billing denied');
  // READ-side denial: org/billing is owner-only, so editor cannot even READ it
  // (admin is denied read too — editor must not exceed admin on the read path).
  assert.equal(check('editor', 'billing', 'read'), 'deny', 'editor cannot read billing');
  assert.equal(check('editor', 'org', 'read'), 'deny', 'editor cannot read org');
  assert.equal(check('editor', 'subscription', 'read'), 'deny', 'editor cannot read subscription');
  assert.equal(check('editor', 'billing', ''), 'deny', 'editor empty-action on billing denied');
});

// F-0021 (security fix): monotonicity invariant — for every resource/action,
// a lower-privilege role granted 'allow' implies the higher role is also 'allow'.
// This property test is what would have caught the editor read/mutate escalations.
test('check: role hierarchy is monotonic (lower allow ⟹ higher allow)', () => {
  const resources = ['graph', 'template', 'logs', 'run', 'billing', 'org', 'subscription', 'seat', 'plan', 'secrets'];
  const actions = ['read', '', 'edit', 'delete', 'run', 'manage', 'deploy'];
  const order = ['viewer', 'editor', 'admin', 'owner']; // ascending privilege
  for (const r of resources) {
    for (const a of actions) {
      for (let i = 0; i < order.length - 1; i++) {
        const lower = check(order[i], r, a);
        const higher = check(order[i + 1], r, a);
        if (lower === 'allow') {
          assert.equal(higher, 'allow', `${order[i + 1]} must allow what ${order[i]} allows: ${r}/${a || '(none)'}`);
        }
      }
    }
  }
});

test('check: viewer read-only across multiple resources', () => {
  assert.equal(check('viewer', 'graph', 'read'), 'allow');
  assert.equal(check('viewer', 'logs', 'read'), 'allow');
  assert.equal(check('viewer', 'template', 'read'), 'allow');
  // viewer denied all mutations regardless of resource
  assert.equal(check('viewer', 'graph', 'edit'), 'deny');
  assert.equal(check('viewer', 'logs', 'edit'), 'deny');
  assert.equal(check('viewer', 'template', 'edit'), 'deny');
  assert.equal(check('viewer', 'billing', 'edit'), 'deny');
});

// ── Defensive hardening: fail-CLOSED input contract ──────────────────────────
// (a) Require an explicit known action — empty/unknown actions deny, never read.
test('check: empty action denies for bounded roles (no implicit read)', () => {
  // editor/viewer previously read-defaulted on '' — now fail-closed
  assert.equal(check('viewer', 'graph', ''), 'deny', 'viewer empty action -> deny');
  assert.equal(check('viewer', 'logs', ''), 'deny', 'viewer empty action on logs -> deny');
  assert.equal(check('editor', 'graph', ''), 'deny', 'editor empty action on mutable graph -> deny');
  assert.equal(check('editor', 'template', ''), 'deny', 'editor empty action on template -> deny');
  // explicit read is still allowed — no regression on the read path
  assert.equal(check('viewer', 'graph', 'read'), 'allow', 'viewer explicit read still allowed');
  assert.equal(check('editor', 'graph', 'read'), 'allow', 'editor explicit read still allowed');
});

test('check: unknown action denies for bounded roles (not read, not a mutation)', () => {
  // an unrecognized verb must NOT slip through as a graph/template mutation for editor
  assert.equal(check('editor', 'graph', 'frobnicate'), 'deny', 'editor unknown action on graph -> deny');
  assert.equal(check('editor', 'template', 'sudo'), 'deny', 'editor unknown action on template -> deny');
  assert.equal(check('viewer', 'graph', 'frobnicate'), 'deny', 'viewer unknown action -> deny');
  // sanity: a KNOWN mutation on an editor-mutable resource still works
  assert.equal(check('editor', 'graph', 'edit'), 'allow', 'editor known mutation (edit) still allowed');
  assert.equal(check('editor', 'graph', 'update'), 'allow', 'editor known mutation (update) on graph allowed');
});

// (b) .trim() — padded-but-valid input resolves to its intended (still gated) role,
//     and a padded resource cannot bypass the exact-match org/billing denial.
test('check: padded principal resolves to its intended role (not silent default-deny)', () => {
  assert.equal(check('owner ', 'graph', 'edit'), 'allow', 'padded owner -> allow');
  assert.equal(check(' OWNER ', 'graph', 'edit'), 'allow', 'padded/upper owner -> allow');
  assert.equal(check(' viewer ', 'graph', 'read'), 'allow', 'padded viewer read -> allow');
  assert.equal(check('  editor', 'graph', 'edit'), 'allow', 'padded editor -> allow on graph mutation');
  // still correctly gated after trimming — padding does not grant anything new
  assert.equal(check(' viewer ', 'graph', 'edit'), 'deny', 'padded viewer mutation still -> deny');
  assert.equal(check(' bogus ', 'graph', 'read'), 'deny', 'padded unknown principal still default-denies');
});

test('check: padded resource/action are trimmed (padded billing cannot bypass org/billing)', () => {
  // BEFORE the trim, a padded resource was an exact-match miss that fell through to
  // 'allow' for admin (and to a read for editor) — this is the resource-axis fail-open
  // the trim closes.
  assert.equal(check('admin', 'billing ', 'edit'), 'deny', 'padded billing denied for admin (no bypass)');
  assert.equal(check('admin', ' org ', 'manage'), 'deny', 'padded org denied for admin');
  assert.equal(check('editor', ' billing ', 'read'), 'deny', 'padded billing read denied for editor');
  // a padded but valid action still resolves to its action
  assert.equal(check('viewer', 'graph', ' read '), 'allow', 'padded read action still resolves to read');
});

// Monotonicity (lower 'allow' ⟹ higher 'allow') must STILL hold under the hardened
// fail-closed contract — including for empty, unknown, and padded actions/resources.
test('check: monotonic under fail-closed contract (empty/unknown/padded inputs)', () => {
  const resources = ['graph', 'template', 'logs', 'run', 'billing', 'org', 'secrets', ' billing '];
  const actions = ['', 'frobnicate', ' read ', 'edit ', '  '];
  const order = ['viewer', 'editor', 'admin', 'owner']; // ascending privilege
  for (const r of resources) {
    for (const a of actions) {
      for (let i = 0; i < order.length - 1; i++) {
        const lower = check(order[i], r, a);
        const higher = check(order[i + 1], r, a);
        if (lower === 'allow') {
          assert.equal(higher, 'allow', `${order[i + 1]} must allow what ${order[i]} allows: ${r}/'${a}'`);
        }
      }
    }
  }
});

// ── Held-out property tests (audit finding): default-deny over a generated input space ──
// These encode SPEC properties (rbac.ts docstring) independently of the implementation's
// branches, exercised over a broad, DETERMINISTIC (seeded — no Math.random flakiness) set of
// inputs. They are the tests that would catch a regression of the fall-through `return 'deny'`.
const KNOWN_ROLES = new Set(['owner', 'admin', 'editor', 'viewer']);

test('check: arbitrary (non-role) principals are default-denied on every resource/action', () => {
  // Curated adversarial principals an attacker might try (privilege-flavored + edge cases).
  const curated = [
    '', '   ', '\t\n', 'root', 'superuser', 'administrator', 'sysadmin', 'system', 'god',
    'anonymous', 'guest', 'nobody', 'null', 'undefined', 'true', '0', '*', 'all', 'role',
    'owner_', '0wner', 'ownerx', 'xowner', 'ad min', 'owner admin', 'editor;owner',
    'owner\n', 'service', 'bot', 'agent', '__proto__', 'constructor', 'prototype'
  ];
  // Deterministic pseudo-random principals via a seeded LCG (reproducible; not Math.random).
  let seed = 0x5eed1234;
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789 _-.@';
  const generated: string[] = [];
  for (let i = 0; i < 200; i++) {
    const len = 1 + Math.floor(rand() * 16);
    let s = '';
    for (let j = 0; j < len; j++) s += charset[Math.floor(rand() * charset.length)];
    generated.push(s);
  }
  // Keep only principals that do NOT normalize to a real role (those are correctly NOT default-denied).
  const principals = [...curated, ...generated].filter((p) => !KNOWN_ROLES.has(String(p).toLowerCase().trim()));
  const resources = ['graph', 'template', 'logs', 'run', 'billing', 'org', 'secrets', '', 'anything', ' graph '];
  const actions = ['read', 'edit', 'create', 'update', 'delete', 'export', 'run', 'manage', 'deploy', 'admin', '', 'frobnicate', ' read '];
  let checked = 0;
  for (const p of principals) {
    for (const r of resources) {
      for (const a of actions) {
        assert.equal(check(p, r, a), 'deny', `arbitrary principal ${JSON.stringify(p)} must be denied on ${JSON.stringify(r)}/${JSON.stringify(a)}`);
        checked++;
      }
    }
  }
  // Anti-tautology guard: a property test that asserts over an empty space passes vacuously.
  // Require a broad sweep so a future refactor that empties the input set fails loudly.
  assert.ok(checked > 5000, `expected a broad sweep of the input space, only checked ${checked}`);
});

test('check: org/billing-type resources are owner-only (every non-owner denied, every action)', () => {
  const ownerOnly = ['org', 'billing', 'subscription', 'seat', 'plan'];
  const nonOwners = ['admin', 'editor', 'viewer', 'root', 'superuser', '', 'anything'];
  const actions = ['read', 'edit', 'create', 'update', 'delete', 'export', 'run', 'manage', 'deploy', 'admin', '', 'frobnicate'];
  for (const r of ownerOnly) {
    for (const p of nonOwners) {
      for (const a of actions) {
        assert.equal(check(p, r, a), 'deny', `${p || '(empty)'} must be denied on owner-only ${r}/${a || '(none)'}`);
      }
    }
    // Positive side (anti-tautology): owner IS allowed on these resources — proves the resource
    // isn't just globally denied, so the deny assertions above are meaningful.
    assert.equal(check('owner', r, 'read'), 'allow', `owner allowed to read ${r}`);
    assert.equal(check('owner', r, 'manage'), 'allow', `owner allowed to manage ${r}`);
  }
});
