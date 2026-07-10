#!/usr/bin/env node
// bench/micro.mjs — LOCAL micro-benchmarks (no API, no credits, deterministic).
//
// Measures the engine dimension you can establish without an LLM call: gate wall-clock
// (does a change make the engine's quality gate slower per cycle?). This is the "speed /
// performance" axis that needs zero tokens. Run before AND after a change; compare the JSON
// with `node bench/run.mjs --compare <old> <new>`.
//
// (A pure-function throughput bench used to live here, pointed at the ForgeOps demo logic; it
// was removed with the demo. Re-add a `micro(name, fn, iters)` block if a hot engine pure-
// function ever needs a throughput-regression guard.)
//
// Usage:
//   node bench/micro.mjs            # gate-latency micro-benchmarks
//   node bench/micro.mjs --gate     # also time `scripts/verify.sh` end-to-end (slow)
//   node bench/micro.mjs --json     # emit one JSON line (for the results log)

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const wantGate = args.includes('--gate');
const asJson = args.includes('--json');

const gates = [];
function timeCmd(name, cmd, cmdArgs) {
  const start = process.hrtime.bigint();
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', shell: false });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { name, ms: Math.round(ms), exit: r.status };
}
// Always-cheap gate: the state-machine validate (the per-cycle integrity check).
gates.push(timeCmd('update-state --validate', 'node', [path.join(ROOT, 'node_modules/ts-node/dist/bin.js'), 'scripts/update-state.ts', '--validate']));
if (wantGate) {
  // The full quality gate — slow (typecheck+lint+tests+mutation). The headline "did this
  // change slow the cycle?" number. Skipped by default because it's ~minutes.
  gates.push(timeCmd('verify.sh (full gate)', 'bash', ['scripts/verify.sh']));
}

const record = {
  kind: 'micro',
  // NOTE: timestamp is stamped by the caller/CI, not here, to keep the bench reproducible.
  node: process.version,
  functions: [],
  gates,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(record)}\n`);
} else {
  console.log('── bench/micro — local, no-API benchmarks ──');
  console.log(`node ${process.version}`);
  console.log('\nGate latency (wall-clock):');
  for (const g of gates) console.log(`  ${g.name.padEnd(24)} ${String(g.ms).padStart(7)} ms   (exit ${g.exit})`);
  console.log('\nTip: `node bench/micro.mjs --json >> bench/results/micro.jsonl` before & after a change, then diff.');
}
