#!/usr/bin/env node
// run-suite.mjs — end-to-end runner for an L1+ suite task: have an agent BUILD the deliverable
// (via `claude -p` with file tools), then score it with the task's oracle. Captures the
// project-blueprint telemetry: oracle score (held-out + anti-cheat), tokens, cost, wall-clock,
// and num_turns (the iteration/loop-count metric — architectural stability).
//
// Usage:
//   node bench/suite/run-suite.mjs L3-mcp-calc-search            # one clean build (no engine context)
//   node bench/suite/run-suite.mjs L3-mcp-calc-search --ctx engine
//   node bench/suite/run-suite.mjs L1-parse-duration --repeat 5  # N independent builds → pass^k reliability
//
// A SINGLE run is an anecdote, not a measurement (testing-suite-plan.md §6.5). --repeat runs the
// same task N independent times and reports the pass-rate + score/cost/turn spread, which is the
// reliability signal (tau-bench's pass^k). Records APPEND to the per-task JSONL so reliability
// accumulates across sessions.
//
// NOTE: each build bills the Agent SDK credit pool (a real agent build). The oracle run is free.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const taskId = argv.find((a) => !a.startsWith('--')) || 'L3-mcp-calc-search';
const ctx = flag('--ctx', 'clean');
const repeat = Math.max(1, Number(flag('--repeat', '1')) || 1);
const TASK = path.join(HERE, taskId);
if (!fs.existsSync(TASK)) { console.error(`task not found: ${TASK}`); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(path.join(TASK, 'meta.json'), 'utf8'));
const prompt = fs.readFileSync(path.join(TASK, 'task.md'), 'utf8');
const passThreshold = meta.pass_threshold ?? 1.0;
const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || 'nogit';
const RESULTS = path.join(ROOT, 'bench', 'results');
fs.mkdirSync(RESULTS, { recursive: true });
const jsonl = path.join(RESULTS, `suite-${taskId}-${ctx}-${sha}.jsonl`);

// One independent build+score. Returns the telemetry record.
function runOnce(runIdx) {
  const base = ctx === 'engine' ? path.join(ROOT, 'tmp') : os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  const workdir = fs.mkdtempSync(path.join(base, `bench-${taskId}-`));
  // Fixtures may be nested (e.g. a monorepo: packages/auth/config.mjs) — mkdir -p the parent so
  // the copy preserves the relative tree. Flat fixtures still work (dirname === workdir).
  for (const f of meta.fixtures || []) {
    const dest = path.join(workdir, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(TASK, 'fixtures', f), dest);
  }

  const start = process.hrtime.bigint();
  const cli = ['-p', prompt, '--output-format', 'json', '--model', meta.budget?.model || 'sonnet',
    '--allowedTools', 'Write,Edit,Read,Bash', '--permission-mode', 'acceptEdits',
    '--max-turns', String(meta.budget?.max_turns || 30)];
  const r = spawnSync('claude', cli, { cwd: workdir, input: '', encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const wall_ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
  let payload = {};
  try { payload = JSON.parse(r.stdout); } catch { /* may be an error */ }
  const u = payload.usage || {};

  const serverPath = path.join(workdir, meta.entrypoint);
  const built = fs.existsSync(serverPath);
  let oracle = { score: 0, dq: false, groups: {}, note: 'no deliverable produced' };
  if (built) {
    const o = spawnSync('node', [path.join(TASK, meta.oracle), '--server', serverPath, '--workdir', workdir, '--json'], { encoding: 'utf8' });
    try { oracle = JSON.parse((o.stdout || '').trim().split('\n').pop()); } catch { oracle = { score: 0, dq: false, note: 'oracle did not return JSON' }; }
  }

  const record = {
    ts: new Date().toISOString(), task: taskId, ctx, sha, run: runIdx, model: meta.budget?.model,
    oracle_score: oracle.score, dq: !!oracle.dq, groups: oracle.groups, gated_fail: oracle.gated_fail ?? null,
    finished: !payload.is_error && r.status === 0, built,
    in_tokens: u.input_tokens ?? null, out_tokens: u.output_tokens ?? null,
    cache_read: u.cache_read_input_tokens ?? null, cache_write: u.cache_creation_input_tokens ?? null,
    cost_usd: payload.total_cost_usd ?? null, wall_ms, iterations: payload.num_turns ?? null,
  };
  fs.appendFileSync(jsonl, `${JSON.stringify(record)}\n`);
  fs.rmSync(workdir, { recursive: true, force: true });
  return record;
}

function isPass(rec) { return !rec.dq && (rec.oracle_score ?? 0) >= passThreshold; }

const records = [];
for (let i = 1; i <= repeat; i++) {
  console.log(`── building ${taskId} (ctx=${ctx}, model=${meta.budget?.model}) — run ${i}/${repeat} ──`);
  const rec = runOnce(i);
  records.push(rec);
  console.log(`   run ${i}: score ${rec.oracle_score}${rec.dq ? ' ⚠DQ' : ''}${isPass(rec) ? ' ✓pass' : ' ✗fail'}  · ${rec.iterations} turns · $${(rec.cost_usd ?? 0).toFixed(4)} · ${rec.wall_ms}ms · ${JSON.stringify(rec.groups)}`);
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r2 = (x) => Math.round(x * 100) / 100;
if (repeat === 1) {
  const rec = records[0];
  console.log('\n── telemetry (project-blueprint dashboard) ──');
  console.log(`  task ............... ${taskId} (${ctx})`);
  console.log(`  oracle score ....... ${rec.oracle_score}${rec.dq ? '  ⚠ DQ (anti-cheat)' : ''}   ${JSON.stringify(rec.groups)}`);
  console.log(`  built / finished ... ${rec.built} / ${rec.finished}`);
  console.log(`  token burn ......... in ${rec.in_tokens}  out ${rec.out_tokens}  cache_r ${rec.cache_read}`);
  console.log(`  cost ............... $${(rec.cost_usd ?? 0).toFixed(4)}`);
  console.log(`  wall-clock ......... ${rec.wall_ms} ms`);
  console.log(`  iterations (turns) . ${rec.iterations}`);
} else {
  const passes = records.filter(isPass).length;
  const scores = records.map((r) => r.oracle_score ?? 0);
  console.log(`\n── reliability over ${repeat} runs (pass = score ≥ ${passThreshold}, not DQ) ──`);
  console.log(`  pass-rate .......... ${passes}/${repeat} (${r2(passes / repeat)})${passes === repeat ? '  — pass^' + repeat + ' clean' : ''}`);
  console.log(`  score  min/mean/max  ${r2(Math.min(...scores))} / ${r2(mean(scores))} / ${r2(Math.max(...scores))}`);
  console.log(`  turns  mean ........ ${r2(mean(records.map((r) => r.iterations ?? 0)))}`);
  console.log(`  cost   mean/total .. $${r2(mean(records.map((r) => r.cost_usd ?? 0)))} / $${r2(records.reduce((s, r) => s + (r.cost_usd ?? 0), 0))}`);
  console.log(`  wall   mean ........ ${Math.round(mean(records.map((r) => r.wall_ms ?? 0)))} ms`);
  console.log(`  built .............. ${records.filter((r) => r.built).length}/${repeat}`);
  // For gated tasks (L4+): did the PASS-REQUIRED security/integrity gates hold every run?
  if (records.some((r) => r.gated_fail !== null && r.gated_fail !== undefined)) {
    const held = records.filter((r) => !(r.gated_fail && r.gated_fail.length)).length;
    console.log(`  gates held ......... ${held}/${repeat}${held === repeat ? '  — security/integrity held on every run' : '  ⚠ a gate failed'}`);
  }
}
console.log(`  → ${path.relative(ROOT, jsonl)}`);
process.exit(0);
