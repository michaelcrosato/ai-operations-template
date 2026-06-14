'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { check } = require('./rbac.js');

const RBAC_CLI = path.join(__dirname, 'rbac.js');

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
  const stdout = execFileSync(process.execPath, [RBAC_CLI], { encoding: 'utf8' });
  const parsed = JSON.parse(stdout.trim());
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
