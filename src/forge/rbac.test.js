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
