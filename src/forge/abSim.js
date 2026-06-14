'use strict';

/**
 * A/B simulator (F-0017 AC2): executes two graph variants over synthetic inputs
 * and emits array of real-time structured logs {ts, nodeId, message, level, costDelta, tokens, latencyMs}.
 * Deterministic (no randomness), zero-dependency CJS.
 * Matches src/health.js + forge/* style: module.exports + CLI-if-main + runtime side-effect emit.
 * Unified chain in CLI: promptToGraph -> abSim logs -> rbac (2 principals) -> exportArtifacts.
 * Side-emits sample-ab-logs.txt (and unifies current samples) to roadmap/evidence/F-0017/
 */

const fs = require('node:fs');
const path = require('node:path');

const { promptToGraph } = require('./promptToGraph');
const { check } = require('./rbac');
const { DEFAULT_MODEL } = require('./models');
const { exportArtifacts } = require('./exportArtifacts');

const EVIDENCE_DIR = path.resolve(__dirname, '..', '..', 'roadmap', 'evidence', 'F-0017');

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

function makeVariants(base) {
  // deterministic A/B: A=base from prompt, B=base with one added opt node + cost tweak
  const A = JSON.parse(JSON.stringify(base));
  const B = JSON.parse(JSON.stringify(base));
  const last = B.nodes[B.nodes.length - 1];
  B.nodes.push({
    id: 'n-optimize',
    type: 'optimize',
    label: 'A/B optimize path',
    position: { x: 1200, y: 0 },
    model: DEFAULT_MODEL,
    prompt: 'Variant B: lower cost path',
    estimatedCost: 0.005
  });
  B.edges.push({ source: last.id, target: 'n-optimize' });
  B.nodes[1].estimatedCost = 0.015; // det tweak for B
  return { A, B };
}

function simulate(graph, variant) {
  // produce structured logs for the variant; fixed base ts + det increments => fully deterministic
  const logs = [];
  let t = Date.parse('2026-06-13T18:00:00.000Z');
  const step = (nodeId, message, level, costDelta, tokens, latencyMs) => {
    logs.push({
      ts: new Date(t).toISOString(),
      nodeId,
      message,
      level,
      costDelta,
      tokens,
      latencyMs
    });
    t += 10;
  };
  step('n-start', `start ${variant}`, 'info', 0, 5, 2);
  for (const n of graph.nodes) {
    if (n.id === 'n-start') continue;
    const cd = typeof n.estimatedCost === 'number' ? n.estimatedCost : 0.01;
    step(n.id, `exec ${n.label} [${variant}]`, 'debug', cd, Math.round(cd * 1000), 15 + (n.id.length % 5));
  }
  step('n-end', `done ${variant}`, 'info', 0, 2, 1);
  return logs;
}

/**
 * abSim(): run A/B over synthetic, return combined structured log array.
 */
function abSim() {
  const base = promptToGraph('Research and summarize for A/B demo');
  const { A, B } = makeVariants(base);
  const logsA = simulate(A, 'A');
  const logsB = simulate(B, 'B');
  const allLogs = [...logsA, ...logsB];
  ensureDir(EVIDENCE_DIR);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'sample-ab-logs.txt'), `${JSON.stringify(allLogs, null, 2)}\n`);
  return allLogs;
}

module.exports = { abSim, makeVariants, simulate };

if (require.main === module) {
  // unified CLI smoke: promptToGraph -> abSim logs -> rbac 2-prin (per security.md) -> export
  const g = promptToGraph('chain demo promptToGraph to abSim to rbac to export');
  process.stdout.write(`graph: ${g.nodes.length} nodes, ${g.edges.length} edges\n`);
  const logs = abSim();
  process.stdout.write(`abSim: ${logs.length} structured logs (A/B variants)\n`);
  if (logs[0]) process.stdout.write(`sample[0]: ${JSON.stringify(logs[0])}\n`);
  const owner = check('owner', 'graph', 'edit');
  const viewerMut = check('viewer', 'graph', 'edit');
  process.stdout.write(`rbac: owner=${owner} viewerMut=${viewerMut}\n`);
  exportArtifacts();
  process.stdout.write('exportArtifacts: ok (graph+Dockerfile+compose)\n');
  const summary = { logs: logs.length, rbac: { owner, viewerMut: viewerMut } };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  process.exitCode = 0;
}
