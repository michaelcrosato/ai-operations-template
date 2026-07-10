#!/usr/bin/env node
// validate.mjs — proves the G3 DAG-pipeline oracle has teeth. Builds a workdir (fixtures +
// reference src/DataImporter.mjs + reference IMPLEMENTATION_PLAN.md), then mutates it per scenario
// and asserts the resulting score / groups. Exit 0 iff:
//   reference                              -> 1.0 (no dq)
//   remove IMPLEMENTATION_PLAN.md          -> plan group < 1 and score < 1 (capability still ok)
//   naive split-only importer (no dedup,
//     no validation)                       -> heldout < 1
//   all-or-nothing importer (any invalid
//     row rejects everything)              -> heldout < 1
//   hardcoded-answers importer             -> heldout < 1
// Cleans up all temp dirs.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');

// Build a fresh workdir = fixtures + reference deliverable, apply mutate(dir), score it.
// mutate receives the workdir root; the entrypoint lives at <dir>/src/DataImporter.mjs.
function score(mutate) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  // fixtures (nested under docs/)
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.copyFileSync(path.join(TASK, 'fixtures', 'docs', 'import-format.md'), path.join(dir, 'docs', 'import-format.md'));
  // reference deliverable
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.copyFileSync(path.join(TASK, 'solution', 'src', 'DataImporter.mjs'), path.join(dir, 'src', 'DataImporter.mjs'));
  fs.copyFileSync(path.join(TASK, 'solution', 'IMPLEMENTATION_PLAN.md'), path.join(dir, 'IMPLEMENTATION_PLAN.md'));
  if (mutate) mutate(dir);
  const server = path.join(dir, 'src', 'DataImporter.mjs');
  const r = spawnSync('node', [VERIFY, '--server', server, '--workdir', dir, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, dq: false, groups: {} }; }
}

const writeImporter = (dir, src) => fs.writeFileSync(path.join(dir, 'src', 'DataImporter.mjs'), src);

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };
const frac = (r, g) => (r.groups && r.groups[g] ? r.groups[g].frac : NaN);

console.log('── G3 DAG-pipeline oracle validity gate ──');

const ref = score(null);
expect('reference deliverable scores 1.0, no DQ', ref.score === 1 && ref.dq === false, `score ${ref.score} dq ${ref.dq} groups ${JSON.stringify(ref.groups)}`);

const noPlan = score((d) => fs.rmSync(path.join(d, 'IMPLEMENTATION_PLAN.md')));
expect('missing IMPLEMENTATION_PLAN.md -> plan group < 1 and score < 1',
  frac(noPlan, 'plan') < 1 && noPlan.score < 1 && frac(noPlan, 'primary') === 1 && frac(noPlan, 'heldout') === 1,
  `score ${noPlan.score} groups ${JSON.stringify(noPlan.groups)}`);

// Naive split-only importer: trusts every row, no validation, no dedup. Returns all rows inserted,
// nothing rejected, status completed. Fails held-out (dedup, all-invalid, header-only, precedence).
const naive = score((d) => writeImporter(d, `
export function importCustomers(csvText) {
  const lines = String(csvText).split(/\\r\\n|\\r|\\n/).slice(1).filter((l) => l.trim() !== '');
  const inserted = lines.map((l) => {
    const [name, email, phone] = l.split(',');
    return { name: (name||'').trim(), email: (email||'').trim(), phone: (phone||'').trim() };
  });
  return { inserted, rejected: [], status: inserted.length ? 'completed' : 'failed' };
}
export default importCustomers;
`));
expect('naive split-only importer (no dedup/validation) -> heldout < 1', frac(naive, 'heldout') < 1, `heldout ${frac(naive, 'heldout')} groups ${JSON.stringify(naive.groups)}`);

// All-or-nothing importer: validates, but if ANY row is invalid it rejects EVERYTHING (inserts
// nothing). Passes some held-out (all-invalid, header-only) but fails the mixed / dup-keep cases.
const allOrNothing = score((d) => writeImporter(d, `
const isAllDigits = (s) => /^[0-9]+$/.test(s);
export function importCustomers(csvText) {
  const dataLines = String(csvText).split(/\\r\\n|\\r|\\n/).slice(1).filter((l) => l.trim() !== '');
  const rows = []; const rejected = []; const seen = new Set();
  let n = 0;
  for (const line of dataLines) {
    n += 1;
    const [rn, re, rp] = line.split(',');
    const name = (rn||'').trim(), email = (re||'').trim(), phone = (rp||'').trim();
    let reason = null;
    if (name === '') reason = 'missing_name';
    else if ((email.match(/@/g) || []).length !== 1) reason = 'invalid_email';
    else if (phone !== '' && (!isAllDigits(phone) || phone.length < 7)) reason = 'invalid_phone';
    else if (seen.has(email.toLowerCase())) reason = 'duplicate_email';
    if (reason) rejected.push({ row_number: n, reason });
    else { seen.add(email.toLowerCase()); rows.push({ name, email, phone }); }
  }
  // all-or-nothing: any rejection voids the whole batch
  if (rejected.length) return { inserted: [], rejected, status: 'failed' };
  return { inserted: rows, rejected: [], status: rows.length ? 'completed' : 'failed' };
}
export default importCustomers;
`));
expect('all-or-nothing importer (any invalid -> reject all) -> heldout < 1', frac(allOrNothing, 'heldout') < 1, `heldout ${frac(allOrNothing, 'heldout')} groups ${JSON.stringify(allOrNothing.groups)}`);

// Hardcoded-answers importer: returns the exact worked-example answer regardless of input.
// Nails PRIMARY's worked example but collapses on held-out (different inputs, same output).
const hardcoded = score((d) => writeImporter(d, `
export function importCustomers() {
  return {
    inserted: [
      { name: 'Ada Lovelace', email: 'ada@example.com', phone: '5551234' },
      { name: 'Grace Hopper', email: 'grace@example.com', phone: '' },
    ],
    rejected: [
      { row_number: 3, reason: 'missing_name' },
      { row_number: 4, reason: 'invalid_email' },
      { row_number: 5, reason: 'invalid_phone' },
      { row_number: 6, reason: 'duplicate_email' },
    ],
    status: 'completed_with_errors',
  };
}
export default importCustomers;
`));
expect('hardcoded-answers importer -> heldout < 1', frac(hardcoded, 'heldout') < 1, `heldout ${frac(hardcoded, 'heldout')} groups ${JSON.stringify(hardcoded.groups)}`);

console.log(fail ? '\n── G3 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; no-plan drops plan+score; naive/all-or-nothing/hardcoded importers fail held-out) ──');
process.exit(fail);
