#!/usr/bin/env node
// Oracle for the G3 DAG-pipeline task (Gauntlet Layer 3 — mandated sequential tool chain).
// The agent must follow Read(docs/import-format.md) -> Plan(IMPLEMENTATION_PLAN.md) ->
// Write(src/DataImporter.mjs) -> Validate. The oracle CANNOT see tool order (that rides the
// runner's iteration/turn telemetry — a disciplined run is a short forward trajectory). So it
// scores a DETERMINISTIC PROXY for the Plan phase plus the actual capability:
//
//   plan    (.25) — IMPLEMENTATION_PLAN.md exists at workspace root, is substantive, and names
//                    importCustomers + at least two of the status states. (DAG Plan-phase proxy.)
//   primary (.40) — import importCustomers from --server; feed the CSVs stated in task.md.
//   heldout (.35) — altered inputs the agent never saw (dup-by-case, all-invalid -> failed,
//                    header-only -> failed, non-digit phone, mixed -> completed_with_errors,
//                    name+email both bad -> missing_name by precedence). Held-out IS the
//                    anti-cheat: it kills hardcoded / naive-split-only / all-or-nothing importers.
//
// dq is always false (no fixture to tamper). A missing module or an import that throws scores 0
// naturally. Usage: node verify.mjs [--server <path>] [--workdir <dir>] [--json]. Exit 0 iff
// score == 1.0 and not dq.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
const modPath = arg('--server') || path.join(TASK, 'solution', 'src', 'DataImporter.mjs');
const workdir = arg('--workdir') || path.dirname(path.dirname(modPath)); // src/ -> workdir root

const norm = (s) => s.replace(/\r\n/g, '\n');
const readMaybe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

// Deep equality good enough for plain JSON (arrays of flat objects + primitives).
function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a !== 'object') return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEq(a[k], b[k]));
}

async function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  // ── plan group: deterministic proxy for the DAG Plan phase ──
  const planRaw = readMaybe(path.join(workdir, 'IMPLEMENTATION_PLAN.md'));
  const plan = planRaw ? norm(planRaw) : '';
  const planLower = plan.toLowerCase();
  add('plan', 'IMPLEMENTATION_PLAN.md present at workspace root', planRaw !== null);
  add('plan', 'IMPLEMENTATION_PLAN.md is substantive (length > 200)', plan.trim().length > 200);
  add('plan', 'plan mentions importCustomers', /importcustomers/.test(planLower));
  const states = ['completed_with_errors', 'completed', 'failed'].filter((s) => planLower.includes(s));
  add('plan', 'plan names at least two of the status states', states.length >= 2);

  // ── import the candidate module ──
  let fn = null;
  try {
    const mod = await import(pathToFileURL(modPath).href);
    fn = mod.importCustomers || (typeof mod.default === 'function' ? mod.default : null);
  } catch { /* import failed -> capability groups all fail */ }

  // call() runs the importer and returns the result object, or null on throw / non-object.
  const call = (csv) => { try { const r = fn(csv); return (r && typeof r === 'object') ? r : null; } catch { return null; } };
  const ins = (r) => (r && Array.isArray(r.inserted)) ? r.inserted : null;
  const rej = (r) => (r && Array.isArray(r.rejected)) ? r.rejected : null;

  if (typeof fn !== 'function') {
    add('primary', 'module exports an importCustomers function', false);
    add('heldout', 'module exports an importCustomers function', false);
  } else {
    // ── PRIMARY — the worked example + behaviors stated in task.md / the spec ──
    const example = [
      'name,email,phone',
      'Ada Lovelace,ada@example.com,5551234',
      'Grace Hopper,grace@example.com,',
      ',bob@example.com,5559999',
      'Carol,carolexample.com,5550000',
      'Dave,dave@example.com,12ab',
      'Ada Again,ADA@EXAMPLE.COM,5550001',
    ].join('\n');
    const ex = call(example);
    add('primary', 'worked example: status completed_with_errors', ex?.status === 'completed_with_errors');
    add('primary', 'worked example: inserts the two valid rows (trimmed, empty phone kept)',
      deepEq(ins(ex), [
        { name: 'Ada Lovelace', email: 'ada@example.com', phone: '5551234' },
        { name: 'Grace Hopper', email: 'grace@example.com', phone: '' },
      ]));
    add('primary', 'worked example: rejects rows 3,4,5,6 with correct reasons',
      deepEq(rej(ex), [
        { row_number: 3, reason: 'missing_name' },
        { row_number: 4, reason: 'invalid_email' },
        { row_number: 5, reason: 'invalid_phone' },
        { row_number: 6, reason: 'duplicate_email' },
      ]));
    const allGood = call('name,email,phone\nEve,eve@example.com,5551111\nFrank,frank@example.com,');
    add('primary', 'all-valid input: status completed, zero rejected',
      allGood?.status === 'completed' && deepEq(rej(allGood), []) && (ins(allGood)?.length === 2));

    // ── HELD-OUT — altered inputs the agent never saw (anti-overfit / anti-cheat) ──
    // 1. duplicate emails differing only by case -> first kept, later rejected duplicate_email.
    const dup = call('name,email,phone\nFirst,USER@Site.COM,\nSecond,user@site.com,');
    add('heldout', 'case-only duplicate: first kept, second duplicate_email',
      ins(dup)?.length === 1 && ins(dup)[0]?.email === 'USER@Site.COM'
        && deepEq(rej(dup), [{ row_number: 2, reason: 'duplicate_email' }])
        && dup?.status === 'completed_with_errors');
    // 2. all-invalid input -> status failed, inserted empty.
    const allBad = call('name,email,phone\n,a@b.com,\nNoAt,nope,\nBadPhone,ok@ok.com,12ab');
    add('heldout', 'all-invalid input: status failed, inserted empty',
      allBad?.status === 'failed' && deepEq(ins(allBad), []) && (rej(allBad)?.length === 3));
    // 3. header-only input -> status failed (no data rows).
    const headerOnly = call('name,email,phone\n');
    add('heldout', 'header-only input: status failed, inserted+rejected empty',
      headerOnly?.status === 'failed' && deepEq(ins(headerOnly), []) && deepEq(rej(headerOnly), []));
    // 4. non-digit phone -> invalid_phone (and a too-short all-digit phone too).
    const badPhone = call('name,email,phone\nZoe,zoe@x.com,55a5123\nYan,yan@x.com,12345');
    add('heldout', 'non-digit and too-short phone -> invalid_phone',
      badPhone?.status === 'failed' && deepEq(rej(badPhone), [
        { row_number: 1, reason: 'invalid_phone' },
        { row_number: 2, reason: 'invalid_phone' },
      ]));
    // 5. mixed valid/invalid -> completed_with_errors.
    const mixed = call('name,email,phone\nGood,good@x.com,5551234\nBad,bademail,');
    add('heldout', 'mixed valid/invalid -> completed_with_errors',
      mixed?.status === 'completed_with_errors' && ins(mixed)?.length === 1
        && deepEq(rej(mixed), [{ row_number: 2, reason: 'invalid_email' }]));
    // 6. name missing AND email bad -> precedence picks missing_name.
    const prec = call('name,email,phone\n,notanemail,12ab');
    add('heldout', 'name empty AND email bad -> missing_name (precedence)',
      deepEq(rej(prec), [{ row_number: 1, reason: 'missing_name' }]) && prec?.status === 'failed');
    // 7. a two-@ email is invalid_email (exactly one @ required); the valid row still inserts.
    const twoAt = call('name,email,phone\nMax,a@@b.com,\nMia,ok@ok.com,5551234');
    add('heldout', 'email with two @ -> invalid_email; valid row still inserted',
      twoAt?.status === 'completed_with_errors'
        && ins(twoAt)?.length === 1 && ins(twoAt)[0]?.name === 'Mia'
        && deepEq(rej(twoAt), [{ row_number: 1, reason: 'invalid_email' }]));
  }

  const WEIGHTS = { plan: 0.25, primary: 0.4, heldout: 0.35 };
  const groups = {};
  let score = 0;
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const frac = inG.length ? inG.filter((c) => c.pass).length / inG.length : 0;
    groups[g] = { passed: inG.filter((c) => c.pass).length, total: inG.length, frac: Math.round(frac * 100) / 100 };
    score += WEIGHTS[g] * frac;
  }
  score = Math.round(score * 1000) / 1000;
  const record = { task: 'G3-dag-pipeline', score, dq: false, gated_fail: [], groups, checks, server: path.relative(TASK, modPath) };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: G3-dag-pipeline ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}`);
  }
  process.exit(score === 1 && !record.dq ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
