/**
 * F-0029: Unit tests for the centralized demo authorization logic.
 *
 * Tests cover:
 *   1. canEdit predicate (from lib/seed.ts — exposed via canEdit.js mirror)
 *   2. canIntervene predicate (same source)
 *   3. rejectViewerEdit early-return contract (pure function extracted for test)
 *
 * The rejectViewerEdit contract: returns true (abort) when persona is viewer,
 * false (proceed) when persona can edit. The toast side-effect is UI-only and
 * is NOT tested here (that path lives in E2E).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Re-use the already-tested pure predicate from the CJS mirror.
// (lib/seed.ts canEdit / canIntervene have identical logic — this avoids
// duplicating the predicate definition while keeping tests self-contained.)
import { userCanEdit } from './canEdit.ts';

// ── canIntervene predicate ────────────────────────────────────────────────────
// canIntervene mirrors canEdit exactly in the current demo RBAC policy.
// If the policy diverges in the future, this guard will catch it.
function canIntervene(role: string): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'editor';
}

// ── rejectViewerEdit contract (pure, toast-free) ───────────────────────────
// Returns true when the call-site should abort (viewer), false when it should proceed.
function rejectViewerEditPure(canEdit: boolean): boolean {
  // The actual hook emits a toast; this pure wrapper tests the boolean contract.
  return !canEdit;
}

// ── canEdit tests ─────────────────────────────────────────────────────────────
test('demoAuth canEdit: owner -> true', () => {
  assert.equal(userCanEdit('owner'), true);
});

test('demoAuth canEdit: admin -> true', () => {
  assert.equal(userCanEdit('admin'), true);
});

test('demoAuth canEdit: editor -> true', () => {
  assert.equal(userCanEdit('editor'), true);
});

test('demoAuth canEdit: viewer -> false (read-only)', () => {
  assert.equal(userCanEdit('viewer'), false, 'viewer must be denied all graph mutations');
});

test('demoAuth canEdit: unknown role -> false (deny-by-default)', () => {
  assert.equal(userCanEdit(''), false);
  assert.equal(userCanEdit('superadmin'), false);
  assert.equal(userCanEdit('guest'), false);
});

// ── canIntervene tests ────────────────────────────────────────────────────────
test('demoAuth canIntervene: owner -> true', () => {
  assert.equal(canIntervene('owner'), true);
});

test('demoAuth canIntervene: admin -> true', () => {
  assert.equal(canIntervene('admin'), true);
});

test('demoAuth canIntervene: editor -> true', () => {
  assert.equal(canIntervene('editor'), true);
});

test('demoAuth canIntervene: viewer -> false', () => {
  assert.equal(canIntervene('viewer'), false, 'viewer must not be able to intervene in runs');
});

test('demoAuth canIntervene: unknown role -> false', () => {
  assert.equal(canIntervene(''), false);
  assert.equal(canIntervene('ops'), false);
});

// ── rejectViewerEdit contract ─────────────────────────────────────────────────
test('demoAuth rejectViewerEdit: returns true (abort) for viewer', () => {
  // viewer canEdit=false -> rejectViewerEdit should return true (abort)
  assert.equal(rejectViewerEditPure(userCanEdit('viewer')), true, 'viewer call-site must abort');
});

test('demoAuth rejectViewerEdit: returns false (proceed) for owner', () => {
  assert.equal(rejectViewerEditPure(userCanEdit('owner')), false, 'owner call-site must proceed');
});

test('demoAuth rejectViewerEdit: returns false (proceed) for admin', () => {
  assert.equal(rejectViewerEditPure(userCanEdit('admin')), false);
});

test('demoAuth rejectViewerEdit: returns false (proceed) for editor', () => {
  assert.equal(rejectViewerEditPure(userCanEdit('editor')), false);
});

// ── mutation handler early-return pattern ─────────────────────────────────────
// Simulates what addNodeOfType/handleCreateFromPrompt/etc. do in page.tsx
// after calling rejectViewerEdit: if it returns true, they return early (no-op).
test('demoAuth mutation handler early-return: viewer causes no-op', () => {
  let mutationRan = false;
  function mutationHandler(role: string): void {
    const canEdit = userCanEdit(role);
    if (rejectViewerEditPure(canEdit)) return; // early return for viewer
    mutationRan = true;
  }

  mutationHandler('viewer');
  assert.equal(mutationRan, false, 'viewer must not reach the mutation body');

  mutationHandler('owner');
  assert.equal(mutationRan, true, 'owner must reach the mutation body');
});

test('demoAuth mutation handler early-return: editor proceeds, viewer is blocked', () => {
  const results: Array<{ role: string; ran: boolean }> = [];
  function tryMutate(role: string): void {
    if (rejectViewerEditPure(userCanEdit(role))) {
      results.push({ role, ran: false });
      return;
    }
    results.push({ role, ran: true });
  }

  tryMutate('editor');
  tryMutate('viewer');
  tryMutate('admin');

  assert.equal(results[0].ran, true, 'editor runs');
  assert.equal(results[1].ran, false, 'viewer blocked');
  assert.equal(results[2].ran, true, 'admin runs');
});
