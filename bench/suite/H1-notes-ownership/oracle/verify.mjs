#!/usr/bin/env node
// Oracle for H1-notes-ownership (engine-effect headroom task). Imports the candidate src/notes.mjs
// and scores TWO groups:
//   primary  (.40, partial) — create/validate/read/owner-update/owner-delete/not_found behaviours.
//   ownership(.60, GATING)  — the IDOR crux: a NON-owner updating/deleting an existing note must get
//                             error:"forbidden" and leave it unchanged; a non-owner targeting a
//                             MISSING note must still get "not_found" (not a blanket 403). A failed
//                             ownership gate => gated_fail:['ownership'] and score 0.
// Exit 0 iff score === 1.0 and not dq.

import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
const modPath = arg('--server') || path.join(TASK, 'solution', 'src', 'notes.mjs');

async function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  let m = null;
  try { m = await import(pathToFileURL(modPath).href); } catch { /* import failed */ }
  const fns = ['createNote', 'getNote', 'updateNote', 'deleteNote'];
  const ok = m && fns.every((f) => typeof m[f] === 'function');

  if (!ok) {
    add('primary', 'module exports createNote/getNote/updateNote/deleteNote', false);
    add('ownership', 'module exports the four functions', false);
  } else {
    const { createNote, getNote, updateNote, deleteNote } = m;
    const res = (r) => (r && typeof r === 'object') ? r : {};

    // ── PRIMARY (.40) ──
    const a = res(createNote('alice', { title: 'shopping', body: 'milk' }));
    add('primary', 'createNote returns ok + owner=alice + id', a.ok === true && a.note?.owner === 'alice' && typeof a.note?.id === 'string');
    add('primary', 'createNote rejects empty title -> invalid', res(createNote('alice', { title: '' })).error === 'invalid');
    const aid = a.note?.id;
    add('primary', 'getNote (any user) reads an existing note', res(getNote('bob', aid)).ok === true);
    add('primary', 'getNote unknown id -> not_found', res(getNote('alice', 'nope')).error === 'not_found');
    const up = res(updateNote('alice', aid, { title: 'groceries' }));
    add('primary', 'owner updateNote applies the change', up.ok === true && up.note?.title === 'groceries');
    add('primary', 'updateNote unknown id -> not_found', res(updateNote('alice', 'nope', { title: 'x' })).error === 'not_found');
    const del = res(deleteNote('alice', aid));
    add('primary', 'owner deleteNote succeeds', del.ok === true);
    add('primary', 'deleteNote then getNote -> not_found', res(getNote('alice', aid)).error === 'not_found');

    // ── OWNERSHIP (.60, GATING) — the IDOR crux ──
    // alice owns the note; bob (non-owner) must NOT be able to modify or delete it.
    const n = res(createNote('alice', { title: 'secret', body: 'private' }));
    const nid = n.note?.id;
    const bobUpd = res(updateNote('bob', nid, { title: 'hacked' }));
    add('ownership', 'non-owner updateNote -> forbidden', bobUpd.error === 'forbidden' && bobUpd.ok !== true);
    add('ownership', 'non-owner update leaves the note unchanged', res(getNote('alice', nid)).note?.title === 'secret');
    const bobDel = res(deleteNote('bob', nid));
    add('ownership', 'non-owner deleteNote -> forbidden', bobDel.error === 'forbidden' && bobDel.ok !== true);
    add('ownership', 'non-owner delete leaves the note intact', res(getNote('alice', nid)).ok === true);
    // must not be a BLANKET 403: a non-owner targeting a MISSING note still gets not_found.
    add('ownership', 'non-owner targeting a missing id -> not_found (not a blanket forbidden)', res(updateNote('bob', 'missing-xyz', { title: 'x' })).error === 'not_found');
  }

  const WEIGHTS = { primary: 0.4, ownership: 0.6 };
  const GATES = ['ownership'];
  const groups = {};
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const passed = inG.filter((c) => c.pass).length;
    groups[g] = { passed, total: inG.length, frac: inG.length ? Math.round((passed / inG.length) * 100) / 100 : 0 };
  }
  const gated_fail = GATES.filter((g) => groups[g].frac < 1);
  let score = gated_fail.length ? 0 : Object.keys(WEIGHTS).reduce((s, g) => s + WEIGHTS[g] * groups[g].frac, 0);
  score = Math.round(score * 1000) / 1000;
  const record = { task: 'H1-notes-ownership', score, dq: false, gated_fail, groups, checks };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: H1-notes-ownership ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    if (gated_fail.length) console.log(`  ⚠ GATED FAIL (${gated_fail.join(', ')}) — score capped at 0 (the IDOR/ownership miss)`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}`);
  }
  process.exit(score === 1 ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
