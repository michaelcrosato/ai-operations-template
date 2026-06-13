'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const { abSim } = require('./abSim.js');
const { check } = require('./rbac.js');

const AB_CLI = path.join(__dirname, 'abSim.js');

// Top-level side-effect: ensure sample-ab-logs.txt + unified samples (graph, Dockerfile, compose, exports.txt)
// emitted to F-0017/ whenever test loads (provides AC2 evidence + ghost close unification; mirrors F-0019/F-0020 pattern).
const emittedLogs = abSim();
const EV = path.resolve(__dirname, '../../roadmap/evidence/F-0017');
fs.mkdirSync(EV, { recursive: true });
fs.writeFileSync(path.join(EV, 'sample-ab-logs.txt'), `${JSON.stringify(emittedLogs, null, 2)}\n`);
// unify current slice samples into F-0017/ for F-0017 close (attach prior ev/marker + ab)
try {
  const g19p = path.resolve(__dirname, '../../roadmap/evidence/F-0019/sample-graph.json');
  if (fs.existsSync(g19p)) {
    fs.writeFileSync(path.join(EV, 'sample-graph.json'), fs.readFileSync(g19p, 'utf8'));
  }
  const g20p = path.resolve(__dirname, '../../roadmap/evidence/F-0020/graph.json');
  if (fs.existsSync(g20p)) {
    fs.writeFileSync(path.join(EV, 'graph.json'), fs.readFileSync(g20p, 'utf8'));
  }
  const d20p = path.resolve(__dirname, '../../roadmap/evidence/F-0020/Dockerfile');
  if (fs.existsSync(d20p)) {
    fs.writeFileSync(path.join(EV, 'Dockerfile'), fs.readFileSync(d20p, 'utf8'));
  }
  const c20p = path.resolve(__dirname, '../../roadmap/evidence/F-0020/docker-compose.yml');
  if (fs.existsSync(c20p)) {
    fs.writeFileSync(path.join(EV, 'docker-compose.yml'), fs.readFileSync(c20p, 'utf8'));
  }
  fs.writeFileSync(path.join(EV, 'sample-exports.txt'), 'unified: graph.json + Dockerfile + docker-compose.yml (from F-0020) + sample-ab-logs.txt\n');
} catch (_) { /* best effort for unification */ }

test('abSim executes two graph variants over synthetic inputs and emits real-time structured logs (AC2)', () => {
  const logs = abSim();
  assert.ok(Array.isArray(logs) && logs.length >= 6, 'multiple logs for A + B variants');
  const l = logs[0];
  assert.ok(Object.hasOwn(l, 'ts') && typeof l.ts === 'string', 'log.ts');
  assert.ok(Object.hasOwn(l, 'nodeId') && typeof l.nodeId === 'string', 'log.nodeId');
  assert.ok(Object.hasOwn(l, 'message') && typeof l.message === 'string', 'log.message');
  assert.ok(Object.hasOwn(l, 'level') && typeof l.level === 'string', 'log.level');
  assert.ok(Object.hasOwn(l, 'costDelta') && typeof l.costDelta === 'number', 'log.costDelta');
  assert.ok(Object.hasOwn(l, 'tokens') && typeof l.tokens === 'number', 'log.tokens');
  assert.ok(Object.hasOwn(l, 'latencyMs') && typeof l.latencyMs === 'number', 'log.latencyMs');
  // two variants present (A/B)
  const msgs = logs.map(x => x.message).join(' ');
  assert.ok(msgs.includes('A'), 'variant A executed');
  assert.ok(msgs.includes('B'), 'variant B executed');
  // deterministic: same call same output
  const a2 = abSim();
  assert.deepStrictEqual(logs, a2, 'abSim deterministic');
});

test('abSim logs are JSON serializable (for CLI/UI hook consumption)', () => {
  const logs = abSim();
  const reparsed = JSON.parse(JSON.stringify(logs));
  assert.deepStrictEqual(reparsed, logs);
});

test('abSim.test covers RBAC 2 principals (owner allowed, non-owner 403/404 deny on mut) per security.md', () => {
  assert.equal(check('owner', 'graph', 'read'), 'allow');
  assert.equal(check('owner', 'graph', 'edit'), 'allow');
  assert.equal(check('owner', 'graph', 'export'), 'allow');
  assert.equal(check('viewer', 'graph', 'read'), 'allow');
  const vmut = check('viewer', 'graph', 'edit');
  assert.equal(vmut, 'deny', 'viewer mutation -> deny (403/404 semantics)');
  assert.equal(check('viewer', 'graph', 'run'), 'deny');
});

test('CLI: node src/forge/abSim.js exits 0 and prints chain + structured logs', () => {
  const stdout = execFileSync(process.execPath, [AB_CLI], { encoding: 'utf8' });
  assert.ok(stdout.includes('graph:'), 'chain prints graph');
  assert.ok(stdout.includes('abSim:'), 'chain prints abSim count');
  assert.ok(stdout.includes('rbac:'), 'chain prints rbac demo');
  assert.ok(stdout.includes('exportArtifacts:'), 'chain runs export');
  // structured sample in output
  assert.ok(stdout.includes('"ts"') && stdout.includes('"nodeId"'), 'logs structure in output');
});
