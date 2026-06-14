/**
 * F-0021: Behavioral proof that viewer cannot mutate (unit-level).
 * Tests the pure userCanEdit(role) predicate that gates every canvas
 * graph-mutation control in app/demo/page.tsx.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { userCanEdit } from './canEdit.ts';

test('userCanEdit: owner can edit (true)', () => {
  assert.equal(userCanEdit('owner'), true);
});

test('userCanEdit: admin can edit (true)', () => {
  assert.equal(userCanEdit('admin'), true);
});

test('userCanEdit: editor can edit (true)', () => {
  assert.equal(userCanEdit('editor'), true);
});

test('userCanEdit: viewer cannot edit (false) — read-only persona', () => {
  assert.equal(userCanEdit('viewer'), false, 'viewer must be denied graph mutation');
});

test('userCanEdit: unknown role defaults to deny (false)', () => {
  assert.equal(userCanEdit(''), false);
  assert.equal(userCanEdit('guest'), false);
});
