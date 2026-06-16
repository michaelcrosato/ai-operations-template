#!/usr/bin/env node
// validate.mjs — proves the G2-context-trace oracle has teeth. Builds a workdir (all fixtures,
// then the reference solution overlaid on top), then mutates it to simulate each failure mode and
// asserts the score / gated_fail. Exit 0 iff EVERY assertion holds:
//   reference (config=1800 + trace-report + peripherals untouched) -> 1.0, no gated_fail, no dq;
//   modify session-sync.mjs            -> gated_fail ['integrity'], score 0;
//   delete db-migrator/schema.mjs      -> gated_fail ['integrity'], score 0;
//   revert config to 900               -> patch < 1, score < 1, NOT gated;
//   hardcode 1800 in session.mjs while config stays 900 -> patch < 1 (config-content fails), NOT gated;
//   remove trace-report.json           -> trace 0, score < 1, NOT gated;
//   trace-report missing the gateway hop -> trace < 1, score < 1, NOT gated.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');

// Every fixture file (nested), relative to fixtures/ — copied first, then solution/ overlays the changed ones.
const FIXTURES = [
  'packages/auth/config.mjs',
  'packages/auth/session.mjs',
  'packages/gateway/checkout.mjs',
  'packages/core/session-sync.mjs',
  'packages/db-migrator/schema.mjs',
  'README.md',
];
const SOLUTION = ['packages/auth/config.mjs', 'trace-report.json'];

function copyInto(dir, baseDir, rels) {
  for (const rel of rels) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(baseDir, rel), dest);
  }
}

// Build a fresh workdir = fixtures + reference solution overlay, apply mutate(dir), score it.
function score(mutate) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  copyInto(dir, path.join(TASK, 'fixtures'), FIXTURES);
  copyInto(dir, path.join(TASK, 'solution'), SOLUTION);
  if (mutate) mutate(dir);
  const r = spawnSync('node', [VERIFY, '--workdir', dir, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, dq: false, gated_fail: [] }; }
}

const gated = (rec, g) => Array.isArray(rec.gated_fail) && rec.gated_fail.length === 1 && rec.gated_fail[0] === g;
const notGated = (rec) => Array.isArray(rec.gated_fail) && rec.gated_fail.length === 0;

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── G2 context-trace oracle validity gate ──');

const ref = score(null);
expect('reference scores 1.0, no gated_fail, no DQ',
  ref.score === 1 && notGated(ref) && ref.dq === false, `score ${ref.score} gated ${JSON.stringify(ref.gated_fail)} dq ${ref.dq}`);

const peripheralEdit = score((d) => fs.appendFileSync(path.join(d, 'packages/core/session-sync.mjs'), '\n// tampered\n'));
expect('modified session-sync.mjs → gated_fail [integrity], score 0',
  peripheralEdit.score === 0 && gated(peripheralEdit, 'integrity'), `score ${peripheralEdit.score} gated ${JSON.stringify(peripheralEdit.gated_fail)}`);

const peripheralDelete = score((d) => fs.rmSync(path.join(d, 'packages/db-migrator/schema.mjs')));
expect('deleted db-migrator/schema.mjs → gated_fail [integrity], score 0',
  peripheralDelete.score === 0 && gated(peripheralDelete, 'integrity'), `score ${peripheralDelete.score} gated ${JSON.stringify(peripheralDelete.gated_fail)}`);

const revert900 = score((d) => fs.copyFileSync(path.join(TASK, 'fixtures', 'packages/auth/config.mjs'), path.join(d, 'packages/auth/config.mjs')));
expect('reverted config to 900 → patch < 1, score < 1, not gated',
  revert900.groups.patch.frac < 1 && revert900.score < 1 && notGated(revert900), `patch ${revert900.groups?.patch?.frac} score ${revert900.score} gated ${JSON.stringify(revert900.gated_fail)}`);

// Hardcode 1800 inside session.mjs while config stays 900 — config-content check must still fail.
const hardcoded = score((d) => {
  fs.copyFileSync(path.join(TASK, 'fixtures', 'packages/auth/config.mjs'), path.join(d, 'packages/auth/config.mjs')); // config back to 900
  fs.writeFileSync(path.join(d, 'packages/auth/session.mjs'),
    "export function isExpired(issuedAtSec, nowSec) {\n  return (nowSec - issuedAtSec) >= 1800;\n}\n");
});
expect('hardcoded 1800 in session.mjs (config still 900) → patch < 1 (config-content fails), not gated',
  hardcoded.groups.patch.frac < 1 && hardcoded.score < 1 && notGated(hardcoded), `patch ${hardcoded.groups?.patch?.frac} score ${hardcoded.score} gated ${JSON.stringify(hardcoded.gated_fail)}`);

const noTrace = score((d) => fs.rmSync(path.join(d, 'trace-report.json')));
expect('removed trace-report.json → trace 0, score < 1, not gated',
  noTrace.groups.trace.frac === 0 && noTrace.score < 1 && notGated(noTrace), `trace ${noTrace.groups?.trace?.frac} score ${noTrace.score} gated ${JSON.stringify(noTrace.gated_fail)}`);

const noGatewayHop = score((d) => fs.writeFileSync(path.join(d, 'trace-report.json'), JSON.stringify([
  { file: 'packages/auth/config.mjs', symbol: 'TOKEN_TTL_SECONDS', role: 'source constant' },
  { file: 'packages/auth/session.mjs', symbol: 'isExpired', role: 'consumes the TTL' },
], null, 2)));
expect('trace-report missing the gateway hop → trace < 1, score < 1, not gated',
  noGatewayHop.groups.trace.frac < 1 && noGatewayHop.score < 1 && notGated(noGatewayHop), `trace ${noGatewayHop.groups?.trace?.frac} score ${noGatewayHop.score} gated ${JSON.stringify(noGatewayHop.gated_fail)}`);

console.log(fail ? '\n── G2 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; peripheral damage gates to 0; bad patch/trace caught) ──');
process.exit(fail);
