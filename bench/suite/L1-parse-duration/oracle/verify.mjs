#!/usr/bin/env node
// Oracle for the L1 parse-duration task — imports the candidate module and runs hidden unit
// tests: a PRIMARY set (stated behaviors) + a HELD-OUT set (altered values the agent never saw,
// which kills a server that hardcodes the primary answers). Pure function → no server, no
// fixture to tamper, so held-out IS the anti-cheat. Exit 0 iff score == 1.0.

import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
const modPath = arg('--server') || arg('--module') || path.join(TASK, 'solution', 'duration.mjs');

async function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });
  let fn = null;
  try { fn = (await import(pathToFileURL(modPath).href)).parseDuration; } catch { /* import failed */ }
  const eq = (f, v) => { try { return f() === v; } catch { return false; } };
  const throws = (f) => { try { f(); return false; } catch { return true; } };

  if (typeof fn !== 'function') {
    add('primary', 'module exports a parseDuration function', false);
  } else {
    // PRIMARY — the behaviors stated in task.md
    add('primary', '"1h" → 3600', eq(() => fn('1h'), 3600));
    add('primary', '"30m" → 1800', eq(() => fn('30m'), 1800));
    add('primary', '"1h30m" → 5400', eq(() => fn('1h30m'), 5400));
    add('primary', '"45s" → 45', eq(() => fn('45s'), 45));
    add('primary', 'invalid "abc" throws', throws(() => fn('abc')));
    // HELD-OUT — altered values the agent never saw (kills hardcoding)
    add('heldout', '"2d" → 172800', eq(() => fn('2d'), 172800));
    add('heldout', '"2h15m" → 8100', eq(() => fn('2h15m'), 8100));
    add('heldout', '"90s" → 90', eq(() => fn('90s'), 90));
    add('heldout', '"0s" → 0', eq(() => fn('0s'), 0));
    add('heldout', '"1d2h" → 93600', eq(() => fn('1d2h'), 93600));
    add('heldout', 'garbage "1q" throws', throws(() => fn('1q')));
    add('heldout', 'empty "" throws', throws(() => fn('')));
  }

  const WEIGHTS = { primary: 0.5, heldout: 0.5 };
  const groups = {};
  let score = 0;
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const frac = inG.length ? inG.filter((c) => c.pass).length / inG.length : 0;
    groups[g] = { passed: inG.filter((c) => c.pass).length, total: inG.length, frac: Math.round(frac * 100) / 100 };
    score += WEIGHTS[g] * frac;
  }
  score = Math.round(score * 1000) / 1000;
  const record = { task: 'L1-parse-duration', score, dq: false, groups, checks, server: path.relative(TASK, modPath) };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: L1-parse-duration ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}`);
  }
  process.exit(score === 1 ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
