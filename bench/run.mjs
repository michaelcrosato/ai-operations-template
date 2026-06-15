#!/usr/bin/env node
// bench/run.mjs — the effect-measurement harness for the engine.
//
// WHAT IT MEASURES, per golden task: output QUALITY (graded against an expected answer —
// deterministic where possible), TOKEN consumption, COST (USD), and SPEED (wall-clock ms).
// You run the suite, change the engine, run it again, and `--compare` the two: the deltas
// answer "did that change actually do anything, and was it the effect we expected?"
//
// MEASUREMENT BRIDGE: `claude -p <prompt> --output-format json` returns {result,
// structured_output, usage:{input/output/cache tokens}, total_cost_usd, session_id}. We add
// wall-clock ourselves. (Verified against code.claude.com/docs/en/headless, 2026-06-15.)
//
// AUTH: uses your normal subscription login (NOT --bare, which needs an API key). Runs from
// the repo root so the engine's context (CLAUDE.md/hooks) is loaded — that is deliberate: a
// change to the engine shows up as a token/quality delta vs the prior run at a prior git SHA
// (recorded in each result). NOTE: `claude -p` bills the separate Agent SDK credit pool.
//
// Usage:
//   node bench/run.mjs --dry-run            # validate tasks + print the commands, NO API calls
//   node bench/run.mjs                       # run all tasks, write bench/results/<sha>-<n>.jsonl
//   node bench/run.mjs --task extract-roles  # run one task
//   node bench/run.mjs --baseline            # run all, also save as the baseline
//   node bench/run.mjs --compare A.jsonl B.jsonl   # diff two result files (no API calls)

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASKS_DIR = path.join(ROOT, 'bench', 'tasks');
const RESULTS_DIR = path.join(ROOT, 'bench', 'results');
const SANDBOX = path.join(ROOT, 'bench', 'sandbox'); // clean cwd: no project CLAUDE.md/hooks → reproducible baseline
// Context mode: 'clean' runs from an empty sandbox (the model's raw cost on the task);
// 'engine' runs from the repo root with the full engine context (CLAUDE.md/hooks) loaded.
// The clean→engine delta is the engine's CONTEXT TAX (tokens/cost) — a first-class signal:
// re-run after de-fluffing CLAUDE.md and the engine-mode input tokens should drop.
const CTX = (() => { const i = process.argv.indexOf('--ctx'); return i >= 0 ? process.argv[i + 1] : 'clean'; })();
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

function gitSha() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || 'nogit').trim();
}

function loadTasks() {
  if (!fs.existsSync(TASKS_DIR)) return [];
  return fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => {
    const t = JSON.parse(fs.readFileSync(path.join(TASKS_DIR, f), 'utf8'));
    t._file = f;
    return t;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

// ── Graders: each returns { pass: boolean, detail: string }. Deterministic where possible. ──
function gradeExact(result, g) {
  const got = String(result).trim().toLowerCase();
  const want = String(g.expected).trim().toLowerCase();
  return { pass: got === want, detail: `exact: got "${got.slice(0, 40)}" want "${want}"` };
}
function gradeContains(result, g) {
  const re = new RegExp(g.pattern, g.flags || 'i');
  const hit = re.test(String(result));
  const pass = g.negate ? !hit : hit;
  return { pass, detail: `${g.negate ? 'NOT ' : ''}contains /${g.pattern}/ → ${pass}` };
}
function gradeWordMax(result, g) {
  const words = String(result).trim().split(/\s+/).filter(Boolean).length;
  const keyOk = !g.must_include || new RegExp(g.must_include, 'i').test(String(result));
  return { pass: words <= g.max && keyOk, detail: `words=${words}/${g.max} keyOk=${keyOk}` };
}
function gradeSetEquals(structured, g) {
  const got = structured && Array.isArray(structured[g.field]) ? structured[g.field].map((s) => String(s).toLowerCase()).sort() : null;
  const want = g.expected.map((s) => String(s).toLowerCase()).sort();
  const pass = got !== null && got.length === want.length && got.every((v, i) => v === want[i]);
  return { pass, detail: `set ${g.field}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}` };
}
// codegen: run the returned code in a node subprocess with the task's assertions appended.
function gradeCodegen(result, g) {
  // Strip markdown fences if the model wrapped the code.
  const code = String(result).replace(/^```[a-z]*\n?|\n?```$/gim, '').trim();
  const program = `${code}\n\n;(function(){\n${g.assertions}\n})();\nconsole.log('CODEGEN_OK');`;
  const r = spawnSync('node', ['-e', program], { encoding: 'utf8', timeout: 10000 });
  const pass = (r.stdout || '').includes('CODEGEN_OK');
  return { pass, detail: pass ? 'assertions passed' : `failed: ${(r.stderr || r.stdout || '').trim().slice(0, 120)}` };
}
function grade(task, result, structured) {
  const g = task.grader;
  switch (g.type) {
    case 'exact': return gradeExact(result, g);
    case 'contains': return gradeContains(result, g);
    case 'word_max': return gradeWordMax(result, g);
    case 'set_equals': return gradeSetEquals(structured, g);
    case 'codegen': return gradeCodegen(result, g);
    default: return { pass: false, detail: `unknown grader "${g.type}"` };
  }
}

function buildArgs(task) {
  const a = ['-p', task.prompt, '--output-format', 'json'];
  if (task.model) a.push('--model', task.model);
  if (task.json_schema) a.push('--json-schema', JSON.stringify(task.json_schema));
  if (task.allowedTools) a.push('--allowedTools', task.allowedTools);
  // Floor the turn cap at 6: a --json-schema task spends an extra turn synthesizing the
  // structured output, so --max-turns 1 yields error_max_turns. No-tool tasks can't run away
  // (no tools to loop on), so a generous cap costs nothing but avoids false failures.
  const mt = task.max_turns && task.max_turns >= 6 ? task.max_turns : 6;
  a.push('--max-turns', String(mt));
  return a;
}

function runTask(task) {
  const cliArgs = buildArgs(task);
  const cwd = CTX === 'engine' ? ROOT : SANDBOX;
  const start = process.hrtime.bigint();
  // input:'' closes stdin immediately (claude -p otherwise waits ~3s for piped stdin, and an
  // open pipe under spawnSync surfaced as a spurious exit 1). shell:false — args are an array.
  const r = spawnSync('claude', cliArgs, { cwd, input: '', encoding: 'utf8', timeout: task.timeout_ms || 120000, shell: false, maxBuffer: 20 * 1024 * 1024 });
  const wall_ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
  // The CLI emits the result JSON (with usage/cost) even on a soft non-zero exit (e.g.
  // error_max_turns), so parse stdout regardless and only hard-error when there's no JSON.
  let payload;
  try { payload = JSON.parse(r.stdout); } catch {
    return { id: task.id, error: (r.error && r.error.message) || `exit ${r.status}, no JSON: ${(r.stderr || r.stdout || '').slice(0, 200)}`, wall_ms };
  }
  if (payload.is_error) {
    const u0 = payload.usage || {};
    return { id: task.id, error: `claude ${payload.subtype || 'error'}`, wall_ms, out_tokens: u0.output_tokens ?? null, cost_usd: payload.total_cost_usd ?? null };
  }
  const result = payload.result ?? '';
  const structured = payload.structured_output;
  const verdict = grade(task, result, structured);
  const u = payload.usage || {};
  return {
    id: task.id, category: task.category, tier: task.tier, model: task.model,
    pass: verdict.pass, detail: verdict.detail,
    in_tokens: u.input_tokens ?? null, out_tokens: u.output_tokens ?? null,
    cache_read: u.cache_read_input_tokens ?? null, cache_write: u.cache_creation_input_tokens ?? null,
    cost_usd: payload.total_cost_usd ?? null, wall_ms, api_ms: payload.duration_ms ?? null,
  };
}

// ── --compare: diff two result files, report deltas. ──
function loadResults(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => JSON.parse(l));
}
function compare(fileA, fileB) {
  const A = new Map(loadResults(fileA).map((r) => [r.id, r]));
  const B = new Map(loadResults(fileB).map((r) => [r.id, r]));
  console.log(`\n── compare  A=${path.basename(fileA)}  →  B=${path.basename(fileB)} ──`);
  console.log('task'.padEnd(22) + 'quality'.padEnd(18) + 'tokens(out)'.padEnd(20) + 'cost($)'.padEnd(18) + 'wall(ms)');
  let tA = 0, tB = 0, cA = 0, cB = 0;
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const a = A.get(id), b = B.get(id);
    if (!a || !b) { console.log(`${id.padEnd(22)}(only in ${a ? 'A' : 'B'})`); continue; }
    const q = `${a.pass ? '✓' : '✗'}→${b.pass ? '✓' : '✗'}`;
    const dTok = (b.out_tokens ?? 0) - (a.out_tokens ?? 0);
    const dCost = (b.cost_usd ?? 0) - (a.cost_usd ?? 0);
    const dMs = (b.wall_ms ?? 0) - (a.wall_ms ?? 0);
    tA += a.out_tokens ?? 0; tB += b.out_tokens ?? 0; cA += a.cost_usd ?? 0; cB += b.cost_usd ?? 0;
    console.log(id.padEnd(22) + q.padEnd(18) + `${a.out_tokens}→${b.out_tokens} (${dTok >= 0 ? '+' : ''}${dTok})`.padEnd(20) + `${(dCost >= 0 ? '+' : '')}${dCost.toFixed(4)}`.padEnd(18) + `${dMs >= 0 ? '+' : ''}${dMs}`);
  }
  console.log(`\nTOTAL out-tokens ${tA}→${tB} (${tB - tA >= 0 ? '+' : ''}${tB - tA}, ${tA ? (((tB - tA) / tA) * 100).toFixed(1) : '–'}%)   cost $${cA.toFixed(4)}→$${cB.toFixed(4)}`);
  console.log('NOTE: small-N runs are noisy (model nondeterminism). Treat <~10% token/time deltas as noise unless repeated across runs. Quality regressions (✓→✗) are the hard signal.');
}

// ── main ──
if (flag('--compare')) {
  const [, fileA, fileB] = args.slice(args.indexOf('--compare'));
  if (!fileA || !fileB) { console.error('--compare needs two result files'); process.exit(1); }
  compare(fileA, fileB);
  process.exit(0);
}

let tasks = loadTasks();
const only = opt('--task');
if (only) tasks = tasks.filter((t) => t.id === only);
if (tasks.length === 0) { console.error('no tasks found in bench/tasks/'); process.exit(1); }

if (flag('--dry-run')) {
  console.log('── dry-run: tasks + the claude commands (NO API calls) ──');
  for (const t of tasks) {
    console.log(`\n[${t.id}] ${t.category}/${t.tier} model=${t.model} grader=${t.grader.type}`);
    console.log(`  claude ${buildArgs(t).map((a) => (a.includes(' ') ? `'${a.slice(0, 60)}…'` : a)).join(' ')}`);
  }
  console.log(`\n${tasks.length} task(s) validated. Run without --dry-run to execute (bills the Agent SDK credit pool).`);
  process.exit(0);
}

const sha = gitSha();
fs.mkdirSync(RESULTS_DIR, { recursive: true });
fs.mkdirSync(SANDBOX, { recursive: true });
const records = [];
console.log(`── running ${tasks.length} task(s) @ ${sha} · ctx=${CTX} (${CTX === 'engine' ? 'repo root, full engine context' : 'clean sandbox'}) ──`);
for (const t of tasks) {
  process.stdout.write(`  ${t.id.padEnd(22)} … `);
  const rec = runTask(t);
  rec.sha = sha;
  rec.ctx = CTX;
  records.push(rec);
  if (rec.error) console.log(`ERROR: ${rec.error.slice(0, 80)}`);
  else console.log(`${rec.pass ? '✓' : '✗'}  out=${rec.out_tokens}tok  $${(rec.cost_usd ?? 0).toFixed(4)}  ${rec.wall_ms}ms`);
}
const stamp = `${CTX}-${sha}-${records.length}`;
const outFile = path.join(RESULTS_DIR, `run-${stamp}.jsonl`);
fs.writeFileSync(outFile, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
const passed = records.filter((r) => r.pass).length;
const totOut = records.reduce((s, r) => s + (r.out_tokens ?? 0), 0);
const totCost = records.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
console.log(`\nquality ${passed}/${records.length} · out-tokens ${totOut} · cost $${totCost.toFixed(4)} · → ${path.relative(ROOT, outFile)}`);
if (flag('--baseline')) {
  fs.mkdirSync(path.join(RESULTS_DIR, 'baselines'), { recursive: true });
  const baseFile = path.join(RESULTS_DIR, 'baselines', `baseline-${stamp}.jsonl`);
  fs.copyFileSync(outFile, baseFile);
  console.log(`baseline saved → ${path.relative(ROOT, baseFile)}`);
}
