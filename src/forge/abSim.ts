/**
 * A/B simulator (F-0017 AC2): executes two graph variants over synthetic inputs
 * and emits array of real-time structured logs {ts, nodeId, message, level, costDelta, tokens, latencyMs}.
 * Deterministic (no randomness), zero-dependency TypeScript.
 * Unified chain in CLI: promptToGraph -> abSim logs -> rbac (2 principals) -> exportArtifacts.
 * Side-emits sample-ab-logs.txt (and unifies current samples) to roadmap/evidence/F-0017/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promptToGraph, type ForgeGraph } from './promptToGraph.ts';
import { DEFAULT_MODEL } from './models.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(__dirname, '..', '..', 'roadmap', 'evidence', 'F-0017');

function ensureDir(d: string): void { fs.mkdirSync(d, { recursive: true }); }

export interface AbLog {
  ts: string;
  nodeId: string;
  message: string;
  level: string;
  costDelta: number;
  tokens: number;
  latencyMs: number;
}

export function makeVariants(base: ForgeGraph): { A: ForgeGraph; B: ForgeGraph } {
  // deterministic A/B: A=base from prompt, B=base with one added opt node + cost tweak
  const A: ForgeGraph = JSON.parse(JSON.stringify(base));
  const B: ForgeGraph = JSON.parse(JSON.stringify(base));
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

function simulate(graph: ForgeGraph, variant: string): AbLog[] {
  // produce structured logs for the variant; fixed base ts + det increments => fully deterministic
  const logs: AbLog[] = [];
  let t = Date.parse('2026-06-13T18:00:00.000Z');
  const step = (nodeId: string, message: string, level: string, costDelta: number, tokens: number, latencyMs: number): void => {
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
export function abSim(): AbLog[] {
  const base = promptToGraph('Research and summarize for A/B demo');
  const { A, B } = makeVariants(base);
  const logsA = simulate(A, 'A');
  const logsB = simulate(B, 'B');
  const allLogs = [...logsA, ...logsB];
  ensureDir(EVIDENCE_DIR);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'sample-ab-logs.txt'), `${JSON.stringify(allLogs, null, 2)}\n`);
  return allLogs;
}
