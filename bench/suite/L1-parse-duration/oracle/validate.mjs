#!/usr/bin/env node
// validate.mjs — proves the L1 oracle has teeth: reference scores 1.0, and the held-out set
// catches a server that hardcodes the primary answers. Exit 0 iff all assertions hold.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');
const REF = fs.readFileSync(path.join(TASK, 'solution', 'duration.mjs'), 'utf8');

function score(src) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.writeFileSync(path.join(dir, 'duration.mjs'), src);
  const r = spawnSync('node', [VERIFY, '--server', path.join(dir, 'duration.mjs'), '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN }; }
}

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── L1 oracle validity gate (reference 1.0; held-out catches hardcoding) ──');

expect('reference scores 1.0', score(REF).score === 1, `got ${score(REF).score}`);

// A server that hardcodes ONLY the primary cases — held-out must catch it.
const hardcoded = `export function parseDuration(s){const m={'1h':3600,'30m':1800,'1h30m':5400,'45s':45};if(s in m)return m[s];throw new Error('x');}`;
const hc = score(hardcoded);
expect('hardcoded-to-primary server caught by held-out', hc.score < 1 && hc.score > 0, `score ${hc.score}`);

// off-by-one on the hour multiplier
const offByOne = score(REF.replace('h: 3600', 'h: 3601'));
expect('off-by-one multiplier caught', score(REF.replace('h: 3600', 'h: 3601')).score < 1, `score ${offByOne.score}`);

// missing export → score 0
expect('missing export → 0', score(`export const nope = 1;`).score === 0, `score ${score('export const nope = 1;').score}`);

// always-throws → low score (only the "throws" checks pass)
expect('always-throws caught (low score)', !(score(`export function parseDuration(){throw new Error('x');}`).score >= 0.5), `score ${score("export function parseDuration(){throw new Error('x');}").score}`);

console.log(fail ? '\n── L1 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; hardcoding/off-by-one/missing/throws all caught) ──');
process.exit(fail);
