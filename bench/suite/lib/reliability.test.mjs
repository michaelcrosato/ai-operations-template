// Bench self-test for the reliability/pass logic (run: `node --test bench/suite/lib/reliability.test.mjs`).
// Sibling pattern to each oracle's validate.mjs: a manual, dependency-free check that the harness's
// own measurement logic is correct. Pure + fast (no API, no build), so it can run anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPass } from './reliability.mjs';

test('a clean, scored, non-DQ run passes', () => {
  assert.equal(isPass({ finished: true, dq: false, oracle_score: 1 }, 1), true);
  assert.equal(isPass({ finished: true, dq: false, oracle_score: 0.9 }, 0.85), true);
  assert.equal(isPass({ finished: true, dq: false, oracle_score: 0.85 }, 0.85), true); // boundary
});

test('a NOT-finished run (timed-out / errored) does NOT pass even with a perfect score — the fix', () => {
  assert.equal(isPass({ finished: false, dq: false, oracle_score: 1 }, 1), false);
  // a build that crashed/timed-out but left a scoreable entrypoint must not inflate pass^k
  assert.equal(isPass({ finished: false, dq: false, oracle_score: 1 }, 0.85), false);
});

test('a disqualified (anti-cheat) run never passes', () => {
  assert.equal(isPass({ finished: true, dq: true, oracle_score: 1 }, 1), false);
});

test('a below-threshold score does not pass', () => {
  assert.equal(isPass({ finished: true, dq: false, oracle_score: 0.5 }, 0.85), false);
});

test('a missing score is treated as 0 (no deliverable) and does not pass', () => {
  assert.equal(isPass({ finished: true, dq: false }, 0.85), false);
});

test('a missing finished flag is falsy → not a pass (fail-safe)', () => {
  assert.equal(isPass({ dq: false, oracle_score: 1 }, 1), false);
});
