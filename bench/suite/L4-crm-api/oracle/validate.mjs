#!/usr/bin/env node
// validate.mjs — proves the CRM oracle has teeth. The most important assertion: a build with
// BROKEN RBAC (a viewer can write) must score 0 via the GATE — NOT a deceptive ~65% partial.
// Exit 0 iff the reference scores 1.0 and every broken/insecure variant is correctly handled.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');
const REF = fs.readFileSync(path.join(TASK, 'solution', 'server.mjs'), 'utf8');

function score(serverSrc) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.writeFileSync(path.join(dir, 'server.mjs'), serverSrc);
  const r = spawnSync('node', [VERIFY, '--server', path.join(dir, 'server.mjs'), '--workdir', dir, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, gated_fail: [] }; }
}

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── CRM oracle validity gate (reference 1.0; gates cap insecure/broken builds) ──');

const ref = score(REF);
expect('reference scores 1.0, no gate failed', ref.score === 1 && (ref.gated_fail || []).length === 0, `score ${ref.score} gated ${JSON.stringify(ref.gated_fail)}`);

// THE KEY ONE: broken RBAC (viewer can write) → GATED FAIL, score 0 (not a partial ~0.65)
const noRbac = score(REF.replace('const canWrite = (role) => role === \'owner\' || role === \'editor\';', 'const canWrite = (role) => true;'));
expect('broken RBAC → GATED FAIL, score 0 (not a deceptive partial)', noRbac.score === 0 && (noRbac.gated_fail || []).includes('rbac'), `score ${noRbac.score} gated ${JSON.stringify(noRbac.gated_fail)}`);

// broken referential integrity → gated fail, score 0
const noIntegrity = score(REF.replace('[...db.deals.values()].some((d) => d.contactId === id)', 'false'));
expect('broken integrity → GATED FAIL, score 0', noIntegrity.score === 0 && (noIntegrity.gated_fail || []).includes('integrity'), `score ${noIntegrity.score} gated ${JSON.stringify(noIntegrity.gated_fail)}`);

// broken PRIMARY (filter no-op) but gates intact → PARTIAL credit (not 0, not 1) — proves a
// non-gating miss is partial-credited rather than gating the whole build.
const noFilter = score(REF.replace('if (stage) out = out.filter((d) => d.stage === stage);', 'if (stage) out = out;'));
expect('broken primary (gates ok) → partial credit, not gated', (noFilter.gated_fail || []).length === 0 && noFilter.score < 1 && noFilter.score > 0.5, `score ${noFilter.score} gated ${JSON.stringify(noFilter.gated_fail)}`);

// broken validation (accepts bad email) but gates intact → partial < 1
const noEmail = score(REF.replace('if (!isEmail(body.email)) return send(res, 400, { error: \'valid email required\' });', ''));
expect('missing validation (gates ok) → partial < 1', (noEmail.gated_fail || []).length === 0 && noEmail.score < 1, `score ${noEmail.score}`);

// crashing server → low score
const crash = score('process.exit(1);');
expect('crashing server scores low', !(crash.score > 0.3), `score ${crash.score}`);

console.log(fail ? '\n── CRM VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; broken RBAC/integrity gated to 0; non-gating misses partial-credited; crash caught) ──');
process.exit(fail);
