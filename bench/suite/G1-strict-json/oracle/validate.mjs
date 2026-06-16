#!/usr/bin/env node
// validate.mjs — proves the G1 strict-JSON oracle has teeth. Builds a workdir (fixture
// accounts.csv + the reference benchmark-output.json), then mutates it to simulate each format /
// correctness / anti-cheat failure and asserts the resulting score / dq.
// Exit 0 iff: reference → 1.0 (no dq); code-fenced or pretty-printed output → format < 1; a
// dropped rejected row or a disabled row moved into valid_accounts → correctness < 1; an extra
// file (notes.txt) → format < 1; an altered accounts.csv → DQ, score 0.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');

// Build a fresh workdir = fixture accounts.csv + reference benchmark-output.json, apply mutate, score.
function score(mutate) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.copyFileSync(path.join(TASK, 'fixtures', 'accounts.csv'), path.join(dir, 'accounts.csv'));
  fs.copyFileSync(path.join(TASK, 'solution', 'benchmark-output.json'), path.join(dir, 'benchmark-output.json'));
  if (mutate) mutate(dir);
  const r = spawnSync('node', [VERIFY, '--workdir', dir, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, dq: false }; }
}

const readOut = (d) => JSON.parse(fs.readFileSync(path.join(d, 'benchmark-output.json'), 'utf8'));
const writeMin = (d, o) => fs.writeFileSync(path.join(d, 'benchmark-output.json'), JSON.stringify(o));

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── G1 strict-JSON oracle validity gate ──');

const ref = score(null);
expect('reference benchmark-output.json scores 1.0, no DQ', ref.score === 1 && ref.dq === false, `score ${ref.score} dq ${ref.dq}`);

const fenced = score((d) => {
  const raw = fs.readFileSync(path.join(d, 'benchmark-output.json'), 'utf8');
  fs.writeFileSync(path.join(d, 'benchmark-output.json'), '```json\n' + raw + '\n```');
});
expect('code-fenced output → format < 1 (not DQ)', fenced.groups.format.frac < 1 && fenced.score < 1 && !fenced.dq, `format ${fenced.groups?.format?.frac} score ${fenced.score}`);

const pretty = score((d) => {
  const o = readOut(d);
  fs.writeFileSync(path.join(d, 'benchmark-output.json'), JSON.stringify(o, null, 2));
});
expect('pretty-printed output → format < 1 (not DQ)', pretty.groups.format.frac < 1 && pretty.score < 1 && !pretty.dq, `format ${pretty.groups?.format?.frac} score ${pretty.score}`);

const dropRej = score((d) => { const o = readOut(d); o.rejected_rows = o.rejected_rows.slice(0, -1); o.summary.rejected = o.rejected_rows.length; writeMin(d, o); });
expect('dropped one rejected row → correctness < 1 (not DQ)', dropRej.groups.correctness.frac < 1 && dropRej.score < 1 && !dropRej.dq, `correctness ${dropRej.groups?.correctness?.frac} score ${dropRej.score}`);

// move a DISABLED row (a005 erin, row 5) into valid_accounts → must violate correctness.
const moveDisabled = score((d) => {
  const o = readOut(d);
  o.valid_accounts = [...o.valid_accounts, { account_id: 'a005', email: 'erin@example.com', plan: 'pro' }];
  o.summary.accepted = o.valid_accounts.length;
  writeMin(d, o);
});
expect('disabled row moved into valid_accounts → correctness < 1 (not DQ)', moveDisabled.groups.correctness.frac < 1 && moveDisabled.score < 1 && !moveDisabled.dq, `correctness ${moveDisabled.groups?.correctness?.frac} score ${moveDisabled.score}`);

const extraFile = score((d) => fs.writeFileSync(path.join(d, 'notes.txt'), 'some scratch notes'));
expect('extra file notes.txt in workdir → format < 1 (not DQ)', extraFile.groups.format.frac < 1 && extraFile.score < 1 && !extraFile.dq, `format ${extraFile.groups?.format?.frac} score ${extraFile.score}`);

const tampered = score((d) => {
  const csv = fs.readFileSync(path.join(d, 'accounts.csv'), 'utf8');
  fs.writeFileSync(path.join(d, 'accounts.csv'), csv + 'a999,zoe@example.com,pro,TRUE\n');
});
expect('altered accounts.csv → DQ, score 0', tampered.score === 0 && tampered.dq === true, `score ${tampered.score} dq ${tampered.dq}`);

console.log(fail ? '\n── G1 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; fenced/pretty/extra-file → format<1; dropped/disabled → correctness<1; tampered csv → DQ 0) ──');
process.exit(fail);
