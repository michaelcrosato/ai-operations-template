#!/usr/bin/env node
// Oracle for the L3 MCP-server task — the deterministic, uncheatable verification step
// (per the project blueprint, Stage 1). It is an MCP client over stdio that drives the
// CANDIDATE server and scores it. No LLM judge. Exit 0 iff score == 1.0 and not DQ'd.
//
//   PRIMARY suite      — the behaviors stated in task.md (initialize, tools/list, tool calls).
//   HELD-OUT suite     — ALTERED parameters the agent never saw in the task (kills hardcoded
//                        returns and ungraceful error handling).
//   ANTI-CHEAT DIFF    — the candidate must not have altered the corpus/spec to game the score
//                        → automatic disqualification (score 0, dq=true).
//   SCORING (MCP weights): handshake .20 · discovery .25 · primary behavior .30 · held-out/errors .25.
//
// Usage:
//   node verify.mjs                                  # validate the reference solution
//   node verify.mjs --server <path> --workdir <dir>  # score a candidate build
//   node verify.mjs --json                           # emit one telemetry JSON line

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK_ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const asJson = argv.includes('--json');
const CANON_CORPUS = path.join(TASK_ROOT, 'fixtures', 'corpus.json');

// Default: validate the reference. Set up a clean workdir with the corpus + the reference server.
let serverPath = arg('--server');
let workdir = arg('--workdir');
if (!serverPath) {
  workdir = fs.mkdtempSync(path.join(TASK_ROOT, 'oracle', '.refrun-'));
  fs.copyFileSync(CANON_CORPUS, path.join(workdir, 'corpus.json'));
  fs.copyFileSync(path.join(TASK_ROOT, 'solution', 'server.mjs'), path.join(workdir, 'server.mjs'));
  serverPath = path.join(workdir, 'server.mjs');
}

const sha = (p) => { try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return 'missing'; } };

// ── minimal MCP-over-stdio JSON-RPC client ──
class MCP {
  constructor(cmd, args, cwd) {
    this.child = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    this.pending = new Map();
    this.nextId = 1;
    this.dead = false;
    this.child.on('exit', () => { this.dead = true; for (const { reject } of this.pending.values()) reject(new Error('server exited')); this.pending.clear(); });
    this.child.on('error', () => { this.dead = true; });
    readline.createInterface({ input: this.child.stdout }).on('line', (line) => {
      const t = line.trim(); if (!t) return;
      let msg; try { msg = JSON.parse(t); } catch { return; }
      if (msg.id !== undefined && this.pending.has(msg.id)) { this.pending.get(msg.id).resolve(msg); this.pending.delete(msg.id); }
    });
  }
  request(method, params, timeoutMs = 5000) {
    if (this.dead) return Promise.reject(new Error('server not running'));
    const id = this.nextId++;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout')); } }, timeoutMs);
    });
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return p;
  }
  notify(method, params) { if (!this.dead) this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`); }
  kill() { try { this.child.kill(); } catch { /* ignore */ } }
}

const callText = (resp) => resp?.result?.content?.[0]?.text;
const isErr = (resp) => resp?.result?.isError === true;
const canon = JSON.parse(fs.readFileSync(CANON_CORPUS, 'utf8'));
const rec = (id) => canon.records.find((r) => r.id === id);

async function run() {
  const mcp = new MCP('node', [serverPath], workdir);
  const checks = []; // {group, name, pass}
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });
  const tryResp = async (fn) => { try { return await fn(); } catch { return null; } };

  // handshake
  const init = await tryResp(() => mcp.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'oracle', version: '1' } }));
  add('handshake', 'initialize returns a protocolVersion', init?.result?.protocolVersion);
  mcp.notify('notifications/initialized', {});

  // discovery
  const list = await tryResp(() => mcp.request('tools/list', {}));
  const tools = list?.result?.tools || [];
  const names = new Set(tools.map((t) => t.name));
  add('discovery', 'tools/list exposes add, search, get_record', ['add', 'search', 'get_record'].every((n) => names.has(n)));
  add('discovery', 'each tool advertises an object inputSchema', tools.length >= 3 && tools.every((t) => t.inputSchema?.type === 'object'));

  // primary behavior (stated in task.md)
  const r1 = await tryResp(() => mcp.request('tools/call', { name: 'add', arguments: { a: 2, b: 3 } }));
  add('primary', 'add(2,3) → 5', callText(r1) === '5');
  const r2 = await tryResp(() => mcp.request('tools/call', { name: 'search', arguments: { query: 'security' } }));
  add('primary', 'search("security") → [Security Guide]', (() => { try { const a = JSON.parse(callText(r2)); return a.length === 1 && a[0].url === rec('r3').url; } catch { return false; } })());
  const r3 = await tryResp(() => mcp.request('tools/call', { name: 'get_record', arguments: { id: 'r1' } }));
  add('primary', 'get_record("r1") → the r1 record', (() => { try { return JSON.parse(callText(r3)).url === rec('r1').url; } catch { return false; } })());
  const r4 = await tryResp(() => mcp.request('tools/call', { name: 'get_record', arguments: { id: 'does-not-exist' } }));
  add('primary', 'get_record(unknown) → isError, no crash', isErr(r4) && !mcp.dead);

  // HELD-OUT — altered params the agent never saw (anti-overfit + graceful errors)
  const h1 = await tryResp(() => mcp.request('tools/call', { name: 'add', arguments: { a: -4, b: 100 } }));
  add('heldout', 'add(-4,100) → 96 (not hardcoded)', callText(h1) === '96');
  const h2 = await tryResp(() => mcp.request('tools/call', { name: 'search', arguments: { query: 'billing' } }));
  add('heldout', 'search("billing") → [Billing FAQ]', (() => { try { const a = JSON.parse(callText(h2)); return a.length === 1 && a[0].url === rec('r4').url; } catch { return false; } })());
  const h3 = await tryResp(() => mcp.request('tools/call', { name: 'add', arguments: { a: 'x' } }));
  add('heldout', 'add(bad args) → graceful isError, no crash', isErr(h3) && !mcp.dead);
  const h4 = await tryResp(() => mcp.request('definitely/not_a_method', {}));
  add('heldout', 'unknown method → JSON-RPC error, no crash', h4?.error?.code !== undefined && !mcp.dead);

  mcp.kill();

  // ── ANTI-CHEAT: the candidate must not have altered the corpus to game search/get_record ──
  const corpusMatches = sha(path.join(workdir, 'corpus.json')) === sha(CANON_CORPUS);
  const dq = !corpusMatches;

  // ── score (MCP weights) ──
  const WEIGHTS = { handshake: 0.20, discovery: 0.25, primary: 0.30, heldout: 0.25 };
  let score = 0;
  const groups = {};
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const frac = inG.length ? inG.filter((c) => c.pass).length / inG.length : 0;
    groups[g] = { passed: inG.filter((c) => c.pass).length, total: inG.length, frac: Math.round(frac * 100) / 100 };
    score += WEIGHTS[g] * frac;
  }
  if (dq) score = 0;
  score = Math.round(score * 1000) / 1000;

  const record = { task: 'L3-mcp-calc-search', score, dq, groups, checks, server: path.relative(TASK_ROOT, serverPath) };

  if (asJson) { process.stdout.write(`${JSON.stringify(record)}\n`); }
  else {
    console.log(`── oracle: L3-mcp-calc-search ──`);
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    if (dq) console.log('  ⚠ DISQUALIFIED: corpus.json was altered (anti-cheat)');
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}${dq ? ' (DQ)' : ''}`);
  }
  // cleanup the reference temp workdir
  if (!arg('--server') && workdir) fs.rmSync(workdir, { recursive: true, force: true });
  process.exit(score === 1 && !dq ? 0 : 1);
}

run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
