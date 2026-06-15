#!/usr/bin/env node
// bench/micro.mjs — LOCAL micro-benchmarks (no API, no credits, deterministic).
//
// Measures the dimensions you can establish without an LLM call: pure-function
// throughput (does a change make the product logic slower?) and gate wall-clock
// (does a change make the engine's quality gate slower per cycle?). These are the
// "speed / performance" axes that need zero tokens. Run before AND after a change;
// compare the JSON with `node bench/run.mjs --compare <old> <new>`.
//
// Usage:
//   node bench/micro.mjs            # pure-function micro-benchmarks only (fast)
//   node bench/micro.mjs --gate     # also time `scripts/verify.sh` end-to-end (slow)
//   node bench/micro.mjs --json     # emit one JSON line (for the results log)

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../src/forge/rbac.ts';
import { promptToGraph } from '../src/forge/promptToGraph.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const wantGate = args.includes('--gate');
const asJson = args.includes('--json');

// Time a function over `iters` iterations; return ns/op and ops/sec (median of 5 trials
// to damp JIT/GC noise — a single trial is too noisy to detect a regression).
function micro(name, fn, iters) {
  const trials = [];
  for (let t = 0; t < 5; t++) {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iters; i++) fn(i);
    const ns = Number(process.hrtime.bigint() - start);
    trials.push(ns / iters);
  }
  trials.sort((a, b) => a - b);
  const nsPerOp = trials[2]; // median
  return { name, iters, ns_per_op: Math.round(nsPerOp * 100) / 100, ops_per_sec: Math.round(1e9 / nsPerOp) };
}

const RESOURCES = ['graph', 'template', 'logs', 'billing', 'org', 'secrets'];
const ACTIONS = ['read', 'edit', 'run', 'manage', ''];
const PRINCIPALS = ['owner', 'admin', 'editor', 'viewer', 'root'];
const PROMPTS = ['research the topic and summarize', 'build and deploy the thing', 'analyze then report findings'];

const results = [];
results.push(micro('rbac.check', (i) => check(PRINCIPALS[i % 5], RESOURCES[i % 6], ACTIONS[i % 5]), 1_000_000));
results.push(micro('promptToGraph', (i) => promptToGraph(PROMPTS[i % 3]), 100_000));

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
  // The full quality gate — slow (typecheck+lint+tests+build+mutation). The headline "did
  // this change slow the cycle?" number. Skipped by default because it's ~minutes.
  gates.push(timeCmd('verify.sh (full gate)', 'bash', ['scripts/verify.sh']));
}

const record = {
  kind: 'micro',
  // NOTE: timestamp is stamped by the caller/CI, not here, to keep the bench reproducible.
  node: process.version,
  functions: results,
  gates,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(record)}\n`);
} else {
  console.log('── bench/micro — local, no-API benchmarks ──');
  console.log(`node ${process.version}`);
  console.log('\nPure-function throughput (median of 5 trials):');
  for (const r of results) console.log(`  ${r.name.padEnd(16)} ${String(r.ns_per_op).padStart(8)} ns/op   ${r.ops_per_sec.toLocaleString().padStart(14)} ops/sec`);
  console.log('\nGate latency (wall-clock):');
  for (const g of gates) console.log(`  ${g.name.padEnd(24)} ${String(g.ms).padStart(7)} ms   (exit ${g.exit})`);
  console.log('\nTip: `node bench/micro.mjs --json >> bench/results/micro.jsonl` before & after a change, then diff.');
}
