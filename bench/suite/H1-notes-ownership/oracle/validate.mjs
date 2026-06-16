#!/usr/bin/env node
// validate.mjs — proves the H1 oracle has teeth. Scores the reference + mutant modules and asserts:
// reference -> 1.0; an IDOR build (no owner check, non-owner succeeds) -> gated_fail ['ownership'] = 0;
// a primary miss (no title validation) -> partial < 1 with the gate intact; a blanket-403 build (forbids
// the owner too) -> score < 1 (over-blocking is caught by primary + the not_found-for-missing check).
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');
const REF = fs.readFileSync(path.join(TASK, 'solution', 'src', 'notes.mjs'), 'utf8');

function scoreModule(src) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.writeFileSync(path.join(dir, 'notes.mjs'), src);
  const r = spawnSync('node', [VERIFY, '--server', path.join(dir, 'notes.mjs'), '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, gated_fail: [] }; }
}

// IDOR mutant: correct EXCEPT update/delete drop the owner check, so a non-owner succeeds.
const IDOR = `
let seq=0; const store=new Map(); const nes=(s)=>typeof s==='string'&&s.trim()!=='';
export function createNote(user,input){const t=input?.title;if(!nes(t))return{ok:false,error:'invalid'};const id='note-'+(++seq);const note={id,owner:user,title:t,body:typeof input.body==='string'?input.body:''};store.set(id,note);return{ok:true,note:{...note}};}
export function getNote(user,id){const n=store.get(id);if(!n)return{ok:false,error:'not_found'};return{ok:true,note:{...n}};}
export function updateNote(user,id,input){const n=store.get(id);if(!n)return{ok:false,error:'not_found'};if(input&&'title'in input){if(!nes(input.title))return{ok:false,error:'invalid'};n.title=input.title;}if(input&&'body'in input&&typeof input.body==='string')n.body=input.body;return{ok:true,note:{...n}};}
export function deleteNote(user,id){const n=store.get(id);if(!n)return{ok:false,error:'not_found'};store.delete(id);return{ok:true,note:{...n}};}
`;

// Blanket-403 mutant: update/delete forbid EVERYONE (including the owner) — over-blocking.
const BLANKET = `
let seq=0; const store=new Map(); const nes=(s)=>typeof s==='string'&&s.trim()!=='';
export function createNote(user,input){const t=input?.title;if(!nes(t))return{ok:false,error:'invalid'};const id='note-'+(++seq);const note={id,owner:user,title:t,body:''};store.set(id,note);return{ok:true,note:{...note}};}
export function getNote(user,id){const n=store.get(id);if(!n)return{ok:false,error:'not_found'};return{ok:true,note:{...n}};}
export function updateNote(user,id,input){return{ok:false,error:'forbidden'};}
export function deleteNote(user,id){return{ok:false,error:'forbidden'};}
`;

// Primary-miss mutant: drop the empty-title validation in createNote (gate stays intact).
const NOVALIDATE = REF.replace("if (!isNonEmptyString(title)) return { ok: false, error: 'invalid' };", "");

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── H1-notes-ownership oracle validity gate ──');

const ref = scoreModule(REF);
expect('reference scores 1.0, no gated_fail', ref.score === 1 && (ref.gated_fail || []).length === 0, `score ${ref.score} gated ${JSON.stringify(ref.gated_fail)}`);

const idor = scoreModule(IDOR);
expect('IDOR build (no owner check) -> gated_fail [ownership], score 0', idor.score === 0 && (idor.gated_fail || []).includes('ownership'), `score ${idor.score} gated ${JSON.stringify(idor.gated_fail)}`);

const nv = scoreModule(NOVALIDATE);
expect('primary miss (no title validation) -> partial < 1, gate intact', nv.score < 1 && nv.score > 0 && (nv.gated_fail || []).length === 0, `score ${nv.score} gated ${JSON.stringify(nv.gated_fail)}`);

const bl = scoreModule(BLANKET);
expect('blanket-403 build (forbids the owner too) -> score < 1', bl.score < 1, `score ${bl.score}`);

console.log(fail ? '\n── H1 VALIDITY GATE FAILED ──' : '\n── validity gate: OK (reference 1.0; IDOR -> gated 0; primary-miss partial; blanket-403 caught) ──');
process.exit(fail);
