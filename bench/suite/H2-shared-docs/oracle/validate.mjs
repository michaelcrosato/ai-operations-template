#!/usr/bin/env node
// validate.mjs — proves the H2 oracle has teeth. Scores the reference + one mutant per access-control
// crux and asserts: reference -> 1.0; each dropped crux (view-can-edit / non-owner-deletes /
// non-owner-shares / listDocs-leaks) -> gated_fail ['access'] = 0; a primary miss (no title
// validation) -> partial < 1 with the gate intact. Each mutant is a single targeted edit of the
// reference, so the validity gate stays a precise mutation test.
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');
const REF = fs.readFileSync(path.join(TASK, 'solution', 'src', 'docs.mjs'), 'utf8');

function score(src) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.writeFileSync(path.join(dir, 'docs.mjs'), src);
  const r = spawnSync('node', [VERIFY, '--server', path.join(dir, 'docs.mjs'), '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, gated_fail: [] }; }
}
function mutate(find, replace, label) {
  if (!REF.includes(find)) { console.log(`  [FAIL]  mutation anchor missing: ${label}`); return { score: NaN, gated_fail: [] }; }
  return score(REF.replace(find, replace));
}

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };
const gated = (r) => (r.gated_fail || []).includes('access') && r.score === 0;

console.log('── H2-shared-docs oracle validity gate ──');

const ref = score(REF);
expect('reference scores 1.0, no gated_fail', ref.score === 1 && (ref.gated_fail || []).length === 0, `score ${ref.score} gated ${JSON.stringify(ref.gated_fail)}`);

const viewEdits = mutate(
  "if (a !== 'owner' && a !== 'edit') return { ok: false, error: 'forbidden' }; // view-shared / none -> forbidden",
  "if (!a) return { ok: false, error: 'forbidden' };", 'view-can-edit');
expect('view-shared CAN edit (view!=edit dropped) -> gated 0', gated(viewEdits), `score ${viewEdits.score} gated ${JSON.stringify(viewEdits.gated_fail)}`);

const anyoneDeletes = mutate(
  "if (d.owner !== user) return { ok: false, error: 'forbidden' }; // OWNER ONLY (even edit-shared cannot delete)",
  "", 'non-owner-deletes');
expect('non-owner CAN delete (owner-only-delete dropped) -> gated 0', gated(anyoneDeletes), `score ${anyoneDeletes.score} gated ${JSON.stringify(anyoneDeletes.gated_fail)}`);

const anyoneShares = mutate(
  "if (d.owner !== user) return { ok: false, error: 'forbidden' };       // OWNER ONLY may share",
  "", 'non-owner-shares');
expect('non-owner CAN share (owner-only-share dropped) -> gated 0', gated(anyoneShares), `score ${anyoneShares.score} gated ${JSON.stringify(anyoneShares.gated_fail)}`);

const leaks = mutate(
  "for (const d of store.values()) if (d.owner === user || d.shares.has(user)) docs.push(pub(d));",
  "for (const d of store.values()) docs.push(pub(d));", 'listDocs-leaks');
expect('listDocs leaks all docs (visibility dropped) -> gated 0', gated(leaks), `score ${leaks.score} gated ${JSON.stringify(leaks.gated_fail)}`);

const noValidate = mutate(
  "if (!nes(input?.title)) return { ok: false, error: 'invalid' };",
  "", 'primary-miss');
expect('primary miss (no title validation) -> partial < 1, gate intact', noValidate.score < 1 && noValidate.score > 0 && (noValidate.gated_fail || []).length === 0, `score ${noValidate.score} gated ${JSON.stringify(noValidate.gated_fail)}`);

console.log(fail ? '\n── H2 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; each dropped access crux -> gated 0; primary-miss partial) ──');
process.exit(fail);
