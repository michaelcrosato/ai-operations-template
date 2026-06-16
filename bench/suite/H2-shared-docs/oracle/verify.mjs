#!/usr/bin/env node
// Oracle for H2-shared-docs (larger engine-effect headroom task). Imports the candidate src/docs.mjs
// and scores two groups:
//   primary (.35, partial) — create/validate, owner CRUD, owner share, a shared user reads,
//                            edit-shared updates, basic not_found/invalid semantics.
//   access  (.65, GATING)  — the droppable cruxes: view-shared CANNOT update; only the OWNER
//                            deletes (edit-shared cannot); only the OWNER shares; a no-access user
//                            cannot read; listDocs does NOT leak inaccessible docs. Any failure =>
//                            gated_fail:['access'], score 0.
// Exit 0 iff score === 1.0 and not dq.

import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
const modPath = arg('--server') || path.join(TASK, 'solution', 'src', 'docs.mjs');

async function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  let m = null;
  try { m = await import(pathToFileURL(modPath).href); } catch { /* import failed */ }
  const fns = ['createDoc', 'getDoc', 'updateDoc', 'deleteDoc', 'shareDoc', 'listDocs'];
  const okExports = m && fns.every((f) => typeof m[f] === 'function');

  if (!okExports) {
    add('primary', 'module exports createDoc/getDoc/updateDoc/deleteDoc/shareDoc/listDocs', false);
    add('access', 'module exports the six functions', false);
  } else {
    const { createDoc, getDoc, updateDoc, deleteDoc, shareDoc, listDocs } = m;
    const R = (r) => (r && typeof r === 'object') ? r : {};
    const newId = (owner, title = 't') => R(createDoc(owner, { title, body: 'b' })).doc?.id;

    // ── PRIMARY (.35) ──
    add('primary', 'createDoc empty title -> invalid', R(createDoc('alice', { title: '' })).error === 'invalid');
    const a = R(createDoc('alice', { title: 'plan', body: 'draft' }));
    add('primary', 'createDoc -> ok, owner=alice, has id', a.ok === true && a.doc?.owner === 'alice' && typeof a.doc?.id === 'string');
    add('primary', 'owner getDoc -> ok', R(getDoc('alice', a.doc?.id)).ok === true);
    add('primary', 'owner updateDoc applies change', R(updateDoc('alice', a.doc?.id, { title: 'final' })).doc?.title === 'final');
    add('primary', 'getDoc unknown id -> not_found', R(getDoc('alice', 'nope')).error === 'not_found');
    add('primary', 'shareDoc invalid level -> invalid', R(shareDoc('alice', a.doc?.id, 'bob', 'admin')).error === 'invalid');
    add('primary', 'shareDoc with self -> invalid', R(shareDoc('alice', a.doc?.id, 'alice', 'view')).error === 'invalid');
    const shView = R(shareDoc('alice', a.doc?.id, 'bob', 'view'));
    add('primary', 'owner shareDoc(view) -> ok', shView.ok === true);
    add('primary', 'view-shared user can getDoc', R(getDoc('bob', a.doc?.id)).ok === true);
    const eid = newId('alice', 'editable');
    shareDoc('alice', eid, 'carol', 'edit');
    add('primary', 'edit-shared user can updateDoc', R(updateDoc('carol', eid, { title: 'carol-edit' })).doc?.title === 'carol-edit');
    const did = newId('alice', 'to-delete');
    add('primary', 'owner deleteDoc -> ok then getDoc not_found', R(deleteDoc('alice', did)).ok === true && R(getDoc('alice', did)).error === 'not_found');

    // ── ACCESS (.65, GATING) — the cruxes a one-shot tends to drop ──
    // view != edit: a view-shared user must NOT be able to update.
    const v = newId('alice', 'view-only'); shareDoc('alice', v, 'dave', 'view');
    const vUpd = R(updateDoc('dave', v, { title: 'hacked' }));
    add('access', 'view-shared user updateDoc -> forbidden', vUpd.error === 'forbidden' && vUpd.ok !== true);
    add('access', 'view-shared update left the doc unchanged', R(getDoc('alice', v)).doc?.title === 'view-only');
    // owner-only delete: an EDIT-shared user must NOT be able to delete.
    const e2 = newId('alice', 'edit-shared'); shareDoc('alice', e2, 'erin', 'edit');
    const eDel = R(deleteDoc('erin', e2));
    add('access', 'edit-shared user deleteDoc -> forbidden', eDel.error === 'forbidden' && eDel.ok !== true);
    add('access', 'edit-shared delete left the doc intact', R(getDoc('alice', e2)).ok === true);
    // owner-only share: a non-owner (even edit-shared) must NOT be able to re-share.
    add('access', 'non-owner shareDoc -> forbidden', R(shareDoc('erin', e2, 'mallory', 'view')).error === 'forbidden');
    // no access: a stranger cannot read.
    const s = newId('alice', 'private');
    add('access', 'no-access user getDoc -> forbidden', R(getDoc('stranger', s)).error === 'forbidden');
    // listDocs visibility (dedicated users so the set is controlled): owner sees own; shared sees shared; stranger sees none.
    const o1 = newId('L_owner', 'L1'); const o2 = newId('L_owner', 'L2'); shareDoc('L_owner', o1, 'L_viewer', 'view');
    const ownerList = R(listDocs('L_owner')).docs || [];
    const viewerList = R(listDocs('L_viewer')).docs || [];
    const strangerList = R(listDocs('L_stranger')).docs || [];
    const ids = (xs) => new Set(xs.map((d) => d?.id));
    add('access', 'listDocs(owner) shows own docs', ids(ownerList).has(o1) && ids(ownerList).has(o2));
    add('access', 'listDocs(shared) shows the shared doc only', ids(viewerList).has(o1) && !ids(viewerList).has(o2));
    add('access', 'listDocs(stranger) leaks nothing', !ids(strangerList).has(o1) && !ids(strangerList).has(o2));
  }

  const WEIGHTS = { primary: 0.35, access: 0.65 };
  const GATES = ['access'];
  const groups = {};
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const passed = inG.filter((c) => c.pass).length;
    groups[g] = { passed, total: inG.length, frac: inG.length ? Math.round((passed / inG.length) * 100) / 100 : 0 };
  }
  const gated_fail = GATES.filter((g) => groups[g].frac < 1);
  let score = gated_fail.length ? 0 : Object.keys(WEIGHTS).reduce((s, g) => s + WEIGHTS[g] * groups[g].frac, 0);
  score = Math.round(score * 1000) / 1000;
  const record = { task: 'H2-shared-docs', score, dq: false, gated_fail, groups, checks };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: H2-shared-docs ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    if (gated_fail.length) console.log(`  ⚠ GATED FAIL (${gated_fail.join(', ')}) — score capped at 0 (an access-control crux was dropped)`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}`);
  }
  process.exit(score === 1 ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
