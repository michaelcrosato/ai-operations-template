'use strict';

/**
 * promptToGraph core (F-0019: ForgeOps prompt-to-graph slice 1 of F-0017).
 * Deterministic, zero-dependency, pure function: natural language prompt ->
 * executable agent graph JSON (nodes + edges).
 * Rule/keyword based (no LLM, no net, no rand): base chain + optional research/summarize nodes
 * for common prompt patterns. Always produces >=1 node and >=1 edge; nodes include id/type/label
 * (plus position/model/prompt/estimatedCost for downstream canvas/sim/export). Edges: source/target.
 * Matches src/health.js style (module.exports + CLI-if-main, stdout JSON, exit 0).
 * When run as CLI (or test loads), also writes sample-graph.json to roadmap/evidence/F-0019/
 * (runtime side-effect for smoke evidence; not an agent edit action).
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * @param {string} [prompt]
 * @returns {{nodes: Array<{id:string,type:string,label:string,position?:object,model?:string,prompt?:string,estimatedCost?:number}>, edges: Array<{source:string,target:string}>}}
 */
function promptToGraph(prompt = 'default task') {
  const input = String(prompt || 'default task').trim();
  const lower = input.toLowerCase();

  const nodes = [
    {
      id: 'n-start',
      type: 'start',
      label: 'Receive request',
      position: { x: 0, y: 0 },
      model: 'none',
      prompt: '',
      estimatedCost: 0
    },
    {
      id: 'n-process',
      type: 'process',
      label: 'Execute core task',
      position: { x: 300, y: 0 },
      model: 'grok-4',
      prompt: input,
      estimatedCost: 0.02
    }
  ];
  const edges = [
    { source: 'n-start', target: 'n-process' }
  ];

  // deterministic keyword rules (extensible; same prompt always same nodes/edges)
  if (lower.includes('research') || lower.includes('search') || lower.includes('find')) {
    nodes.push({
      id: 'n-research',
      type: 'research',
      label: 'Research / gather info',
      position: { x: 600, y: -50 },
      model: 'grok-4',
      prompt: `Perform targeted research on: ${input}`,
      estimatedCost: 0.05
    });
    edges.push({ source: 'n-process', target: 'n-research' });
  }
  if (lower.includes('summar') || lower.includes('report') || lower.includes('output')) {
    const lastId = nodes[nodes.length - 1].id;
    nodes.push({
      id: 'n-summarize',
      type: 'summarize',
      label: 'Summarize and format output',
      position: { x: 900, y: 0 },
      model: 'grok-4',
      prompt: 'Summarize findings for operator',
      estimatedCost: 0.01
    });
    edges.push({ source: lastId, target: 'n-summarize' });
  }

  return { nodes, edges };
}

module.exports = { promptToGraph };

if (require.main === module) {
  const userPrompt = process.argv.slice(2).join(' ') || 'Research AI agents and summarize findings';
  const graph = promptToGraph(userPrompt);
  const json = JSON.stringify(graph, null, 2);
  process.stdout.write(`${json}\n`);

  // CLI smoke: emit sample-graph.json (per AC3 + brief)
  const evidenceDir = path.join(__dirname, '..', '..', 'roadmap', 'evidence', 'F-0019');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'sample-graph.json'), `${json}\n`);
  process.exitCode = 0;
}
