#!/usr/bin/env node
// validate.mjs — proves the ORACLE has teeth (the dual-validity gate). The oracle is only
// trustworthy if it scores 1.0 on the reference AND < 1.0 (or DQ) on broken/cheating builds.
// This is the same idea as scripts/mutation-smoke.sh, applied to the task oracle. Exit 0 iff
// the reference passes and EVERY broken variant is caught.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const VERIFY = path.join(HERE, 'verify.mjs');
const REF = fs.readFileSync(path.join(TASK, 'solution', 'server.mjs'), 'utf8');
const CORPUS = fs.readFileSync(path.join(TASK, 'fixtures', 'corpus.json'), 'utf8');

function scoreCandidate(serverSrc, corpusSrc = CORPUS) {
  const dir = fs.mkdtempSync(path.join(HERE, '.val-'));
  fs.writeFileSync(path.join(dir, 'server.mjs'), serverSrc);
  fs.writeFileSync(path.join(dir, 'corpus.json'), corpusSrc);
  const r = spawnSync('node', [VERIFY, '--server', path.join(dir, 'server.mjs'), '--workdir', dir, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { return { score: NaN, dq: false }; }
}

let fail = 0;
const expect = (name, cond, detail) => { console.log(`  ${cond ? '[ok]   ' : '[FAIL] '} ${name}${cond ? '' : `  — ${detail}`}`); if (!cond) fail = 1; };

console.log('── oracle validity gate (reference passes; every cheat is caught) ──');

// 1. reference scores exactly 1.0, not DQ
const ref = scoreCandidate(REF);
expect('reference solution scores 1.0', ref.score === 1 && !ref.dq, `got ${ref.score} dq=${ref.dq}`);

// 2. off-by-one add → behavioral checks fail
const offByOne = scoreCandidate(REF.replace('return textResult(args.a + args.b);', 'return textResult(args.a + args.b + 1);'));
expect('off-by-one add is caught', offByOne.score < 1, `scored ${offByOne.score}`);

// 3. HARDCODED/overfit server (returns canned answers for the PRIMARY cases only) → held-out catches it
const hardcoded = `import * as readline from 'node:readline';
const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');
readline.createInterface({input:process.stdin}).on('line',l=>{let r;try{r=JSON.parse(l)}catch{return}if(r.id==null)return;
 if(r.method==='initialize')return send({jsonrpc:'2.0',id:r.id,result:{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'x',version:'1'}}});
 if(r.method==='tools/list')return send({jsonrpc:'2.0',id:r.id,result:{tools:[{name:'add',inputSchema:{type:'object'}},{name:'search',inputSchema:{type:'object'}},{name:'get_record',inputSchema:{type:'object'}}]}});
 if(r.method==='tools/call'){const n=r.params?.name;let t='';
   if(n==='add')t='5';                                    // hardcoded to the primary case
   else if(n==='search')t=JSON.stringify([{title:'Security Guide',url:'https://example.com/security'}]); // hardcoded
   else if(n==='get_record')t=JSON.stringify({id:'r1',title:'Getting Started',url:'https://example.com/start'});
   return send({jsonrpc:'2.0',id:r.id,result:{content:[{type:'text',text:t}],isError:false}});}
 return send({jsonrpc:'2.0',id:r.id,error:{code:-32601,message:'no'}});});`;
const hc = scoreCandidate(hardcoded);
expect('hardcoded/overfit server is caught by held-out cases', hc.score < 1, `scored ${hc.score}`);

// 4. missing a tool → discovery fails
// CRLF-robust: match the trailing comma+newline as \r?\n so the mutation works regardless of
// the source's line endings (a CRLF checkout silently no-op'd this once — the bug this guards).
const missingTool = scoreCandidate(REF.replace(/\{\s*name: 'get_record',[\s\S]*?\},\r?\n/, ''));
expect('missing tool is caught (discovery)', missingTool.score < 1, `scored ${missingTool.score}`);

// 5. server that crashes on startup → low score, not a pass
const crash = scoreCandidate(`process.exit(1);`);
expect('crashing server scores low', crash.score < 0.3, `scored ${crash.score}`);

// 6. ANTI-CHEAT: reference server but the corpus was altered → DQ
const tampered = scoreCandidate(REF, CORPUS.replace('Security Guide', 'PWNED'));
expect('altered corpus → disqualified', tampered.dq === true && tampered.score === 0, `dq=${tampered.dq} score=${tampered.score}`);

console.log(fail ? '\n── VALIDITY GATE FAILED ──' : '\n── validity gate: OK (oracle passes the reference and catches every cheat) ──');
process.exit(fail);
