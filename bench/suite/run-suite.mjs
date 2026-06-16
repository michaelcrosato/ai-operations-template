#!/usr/bin/env node
// run-suite.mjs — end-to-end runner for an L1+ suite task: have an agent BUILD the deliverable
// (via `claude -p` with file tools), then score it with the task's oracle. Captures the
// project-blueprint telemetry: oracle score (held-out + anti-cheat), tokens, cost, wall-clock,
// and num_turns (the iteration/loop-count metric — architectural stability).
//
// Usage:
//   node bench/suite/run-suite.mjs L3-mcp-calc-search            # clean build (no engine context)
//   node bench/suite/run-suite.mjs L3-mcp-calc-search --ctx engine
//
// NOTE: this bills the Agent SDK credit pool (a real agent build). The oracle run is free.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const taskId = argv.find((a) => !a.startsWith('--')) || 'L3-mcp-calc-search';
const ctx = (() => { const i = argv.indexOf('--ctx'); return i >= 0 ? argv[i + 1] : 'clean'; })();
const TASK = path.join(HERE, taskId);
if (!fs.existsSync(TASK)) { console.error(`task not found: ${TASK}`); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(path.join(TASK, 'meta.json'), 'utf8'));
const prompt = fs.readFileSync(path.join(TASK, 'task.md'), 'utf8');

// Fresh, isolated workdir. clean = a temp dir OUTSIDE the repo (no engine CLAUDE.md/hooks);
// engine = a temp dir UNDER the repo so the engine context loads (the engine-effect variant).
const base = ctx === 'engine' ? path.join(ROOT, 'tmp') : os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const workdir = fs.mkdtempSync(path.join(base, `bench-${taskId}-`));
for (const f of meta.fixtures || []) fs.copyFileSync(path.join(TASK, 'fixtures', f), path.join(workdir, f));

console.log(`── building ${taskId} (ctx=${ctx}, model=${meta.budget?.model}) in ${workdir} ──`);
const start = process.hrtime.bigint();
const cli = ['-p', prompt, '--output-format', 'json', '--model', meta.budget?.model || 'sonnet',
  '--allowedTools', 'Write,Edit,Read,Bash', '--permission-mode', 'acceptEdits',
  '--max-turns', String(meta.budget?.max_turns || 30)];
const r = spawnSync('claude', cli, { cwd: workdir, input: '', encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
const wall_ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
let payload = {};
try { payload = JSON.parse(r.stdout); } catch { /* may be an error */ }
const u = payload.usage || {};

// Score with the oracle (free, deterministic).
const serverPath = path.join(workdir, meta.entrypoint);
const built = fs.existsSync(serverPath);
let oracle = { score: 0, dq: false, groups: {}, note: 'no server.mjs produced' };
if (built) {
  const o = spawnSync('node', [path.join(TASK, meta.oracle), '--server', serverPath, '--workdir', workdir, '--json'], { encoding: 'utf8' });
  try { oracle = JSON.parse((o.stdout || '').trim().split('\n').pop()); } catch { oracle = { score: 0, dq: false, note: 'oracle did not return JSON' }; }
}

const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || 'nogit';
const record = {
  task: taskId, ctx, sha, model: meta.budget?.model,
  oracle_score: oracle.score, dq: !!oracle.dq, groups: oracle.groups,
  finished: !payload.is_error && r.status === 0, built,
  in_tokens: u.input_tokens ?? null, out_tokens: u.output_tokens ?? null,
  cache_read: u.cache_read_input_tokens ?? null, cache_write: u.cache_creation_input_tokens ?? null,
  cost_usd: payload.total_cost_usd ?? null, wall_ms, iterations: payload.num_turns ?? null,
};

const RESULTS = path.join(ROOT, 'bench', 'results');
fs.mkdirSync(RESULTS, { recursive: true });
fs.writeFileSync(path.join(RESULTS, `suite-${taskId}-${ctx}-${sha}.jsonl`), `${JSON.stringify(record)}\n`);

console.log('\n── telemetry (project-blueprint dashboard) ──');
console.log(`  task ............... ${taskId} (${ctx})`);
console.log(`  oracle score ....... ${record.oracle_score}${record.dq ? '  ⚠ DQ (anti-cheat)' : ''}   ${JSON.stringify(record.groups)}`);
console.log(`  built / finished ... ${record.built} / ${record.finished}`);
console.log(`  token burn ......... in ${record.in_tokens}  out ${record.out_tokens}  cache_r ${record.cache_read}`);
console.log(`  cost ............... $${(record.cost_usd ?? 0).toFixed(4)}`);
console.log(`  wall-clock ......... ${record.wall_ms} ms`);
console.log(`  iterations (turns) . ${record.iterations}`);
console.log(`  → bench/results/suite-${taskId}-${ctx}-${sha}.jsonl`);
fs.rmSync(workdir, { recursive: true, force: true });
process.exit(0);
