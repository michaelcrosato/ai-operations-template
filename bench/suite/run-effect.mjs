#!/usr/bin/env node
// run-effect.mjs — the engine-effect A/B (bench/ENGINE-EFFECT-PLAN.md, Phase C). For one task it runs
// N paired seeds; each seed builds ONCE, scores it as **A0 (baseline)**, then applies the engine's
// signature value — a fresh-context independent review against the spec, then a fix pass — and scores
// the SAME (now-remediated) artifact as **A3 (review-fix)**. Pairing on one build isolates the
// review-fix contribution exactly (no build nondeterminism in the delta) and halves build cost.
//
// The model is PINNED across both arms (--model, default per task meta) so the delta is the engine's
// loop, not the model. The reviewer sees only the task spec + the artifact — never the hidden oracle.
//
// Usage: node bench/suite/run-effect.mjs <task> [--repeat N] [--model haiku|sonnet|opus]
// The reliable signal is CATEGORICAL (a seed that A0-fails but A3-passes), per plan §4/§6.5.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPass } from './lib/reliability.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const taskId = argv.find((a) => !a.startsWith('--'));
const repeat = Math.max(1, Number(flag('--repeat', '3')) || 3);
if (!taskId) { console.error('usage: run-effect.mjs <task> [--repeat N] [--model m]'); process.exit(1); }
const TASK = path.join(HERE, taskId);
if (!fs.existsSync(TASK)) { console.error(`task not found: ${TASK}`); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(path.join(TASK, 'meta.json'), 'utf8'));
const prompt = fs.readFileSync(path.join(TASK, 'task.md'), 'utf8');
const model = flag('--model', meta.budget?.model || 'sonnet');
const passThreshold = meta.pass_threshold ?? 1.0;
const maxTurns = String(meta.budget?.max_turns || 30);

function claude(cli, cwd) {
  const start = process.hrtime.bigint();
  const r = spawnSync('claude', cli, { cwd, input: '', encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  let payload = {}; try { payload = JSON.parse(r.stdout); } catch { /* error */ }
  return { payload, status: r.status, wall_ms: Math.round(Number(process.hrtime.bigint() - start) / 1e6) };
}

function mkWorkdir() {
  const wd = fs.mkdtempSync(path.join(os.tmpdir(), `effect-${taskId}-`));
  for (const f of meta.fixtures || []) {
    const dest = path.join(wd, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(TASK, 'fixtures', f), dest);
  }
  return wd;
}

// Score a workdir with the task oracle. Returns { score, dq, gated_fail, built, finished }.
function score(workdir, finished) {
  const entry = path.join(workdir, meta.entrypoint);
  if (!fs.existsSync(entry)) return { score: 0, dq: false, gated_fail: null, built: false, finished };
  const o = spawnSync('node', [path.join(TASK, meta.oracle), '--server', entry, '--workdir', workdir, '--json'], { encoding: 'utf8' });
  let rec = { score: 0, dq: false, gated_fail: null };
  try { rec = JSON.parse((o.stdout || '').trim().split('\n').pop()); } catch { /* no json */ }
  return { score: rec.score ?? 0, dq: !!rec.dq, gated_fail: rec.gated_fail ?? null, built: true, finished };
}

const BUILD = ['-p', prompt, '--output-format', 'json', '--model', model,
  '--allowedTools', 'Write,Edit,Read,Bash', '--permission-mode', 'acceptEdits', '--max-turns', maxTurns];
const REVIEW_PROMPT = `${prompt}\n\n---\nYou are a STRICT, independent code reviewer. The files in this directory are an attempt at the task above. Read them and list EVERY concrete defect or unmet requirement as a numbered list — cite the file and the exact rule from the spec that is violated (pay special attention to rules the happy-path/examples do not exercise). If the implementation fully and correctly meets the spec, output exactly: NO DEFECTS`;
const reviewCli = ['-p', REVIEW_PROMPT, '--output-format', 'json', '--model', model,
  '--allowedTools', 'Read,Grep,Glob', '--permission-mode', 'acceptEdits', '--max-turns', '8'];

function fixCli(findings) {
  const p = `${prompt}\n\n---\nAn independent reviewer found these issues with the current implementation in this directory:\n\n${findings}\n\nFix the implementation so the task spec is fully met. Do not remove existing functionality; address every real issue.`;
  return ['-p', p, '--output-format', 'json', '--model', model,
    '--allowedTools', 'Write,Edit,Read,Bash', '--permission-mode', 'acceptEdits', '--max-turns', maxTurns];
}

// score() returns { score, ... }; isPass expects oracle_score — map it (this mismatch was a real bug
// the first harness-validation run caught: builds scored 1.0 but were mis-counted as fails).
const pass = (r) => isPass({ finished: r.finished, dq: r.dq, oracle_score: r.score }, passThreshold);

const seeds = [];
for (let i = 1; i <= repeat; i++) {
  const wd = mkWorkdir();
  // build once
  const b = claude(BUILD, wd);
  const a0 = score(wd, !b.payload.is_error && b.status === 0);
  // review (read-only) → fix
  let reviewed = '', fixCalls = 0;
  const rv = claude(reviewCli, wd);
  reviewed = (rv.payload.result || '').trim();
  const hasDefects = reviewed && !/^NO DEFECTS\b/i.test(reviewed);
  let fx = { payload: {}, status: 0, wall_ms: 0 };
  if (hasDefects) { fx = claude(fixCli(reviewed), wd); fixCalls = 1; }
  const a3 = score(wd, !fx.payload?.is_error && (fixCalls ? fx.status === 0 : a0.finished));
  fs.rmSync(wd, { recursive: true, force: true });

  const cost = (x) => x.payload?.total_cost_usd ?? 0;
  const rec = {
    seed: i,
    a0_pass: pass(a0), a0_score: a0.score, a0_gated: a0.gated_fail,
    a3_pass: pass(a3), a3_score: a3.score, a3_gated: a3.gated_fail,
    flipped: !pass(a0) && pass(a3),
    review_found_defects: hasDefects,
    cost_a0: cost(b), cost_a3: cost(b) + cost(rv) + (fixCalls ? cost(fx) : 0),
  };
  seeds.push(rec);
  console.log(`  seed ${i}: A0 ${rec.a0_score}${rec.a0_pass ? '✓' : '✗'} → A3 ${rec.a3_score}${rec.a3_pass ? '✓' : '✗'}${rec.flipped ? '  ⟵ FLIP (A0 fail → A3 pass)' : ''}  · review ${hasDefects ? 'found defects' : 'clean'} · $${rec.cost_a3.toFixed(3)}`);
}

const n = seeds.length;
const a0Pass = seeds.filter((s) => s.a0_pass).length;
const a3Pass = seeds.filter((s) => s.a3_pass).length;
const flips = seeds.filter((s) => s.flipped).length;
const sum = (f) => seeds.reduce((s, x) => s + f(x), 0);
const r2 = (x) => Math.round(x * 100) / 100;
console.log(`\n── engine-effect A/B: ${taskId} · model=${model} (PINNED) · N=${n} ──`);
console.log(`  A0 baseline pass-rate ... ${a0Pass}/${n} (${r2(a0Pass / n)})`);
console.log(`  A3 review-fix pass-rate . ${a3Pass}/${n} (${r2(a3Pass / n)})`);
console.log(`  categorical flips ....... ${flips}/${n}  (A0 fail → A3 pass — the engine-effect signal)`);
console.log(`  mean score .............. A0 ${r2(sum((s) => s.a0_score) / n)}  →  A3 ${r2(sum((s) => s.a3_score) / n)}`);
console.log(`  mean cost ............... A0 $${r2(sum((s) => s.cost_a0) / n)}  →  A3 $${r2(sum((s) => s.cost_a3) / n)} (build+review+fix)`);
if (a0Pass === n) console.log('  ⚠ A0 already at ceiling (no headroom on this task/model) — no signal possible; see plan §4 (need a harder task or a weaker pinned model).');
else if (flips > 0) console.log(`  → SIGNAL: the review-fix loop recovered ${flips}/${n} build(s) the bare baseline got wrong.`);
else console.log('  → no flips this run (baseline failures were not recovered by review-fix, or were capability — not scope — misses).');
process.exit(0);
