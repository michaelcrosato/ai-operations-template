/**
 * promptToGraph core (F-0019: ForgeOps prompt-to-graph slice 1 of F-0017).
 * Deterministic, zero-dependency, pure function: natural language prompt ->
 * executable agent graph JSON (nodes + edges).
 * Rule/keyword based (no LLM, no net, no rand): base chain + optional research/summarize nodes
 * for common prompt patterns. Always produces >=1 node and >=1 edge; nodes include id/type/label
 * (plus position/model/prompt/estimatedCost for downstream canvas/sim/export). Edges: source/target.
 * Browser-safe: no fs/process at top level.
 */

import { DEFAULT_MODEL } from './models.ts';

export interface ForgeNode {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
  model?: string;
  prompt?: string;
  estimatedCost?: number;
}

export interface ForgeEdge {
  source: string;
  target: string;
}

export interface ForgeGraph {
  nodes: ForgeNode[];
  edges: ForgeEdge[];
}

/**
 * @param prompt - natural language description of the task
 * @returns graph with nodes and edges
 */
export function promptToGraph(prompt = 'default task'): ForgeGraph {
  const input = String(prompt || 'default task').trim();
  const lower = input.toLowerCase();

  const nodes: ForgeNode[] = [
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
      model: DEFAULT_MODEL,
      prompt: input,
      estimatedCost: 0.02
    }
  ];
  const edges: ForgeEdge[] = [
    { source: 'n-start', target: 'n-process' }
  ];

  // deterministic keyword rules (extensible; same prompt always same nodes/edges)
  if (lower.includes('research') || lower.includes('search') || lower.includes('find')) {
    nodes.push({
      id: 'n-research',
      type: 'research',
      label: 'Research / gather info',
      position: { x: 600, y: -50 },
      model: DEFAULT_MODEL,
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
      model: DEFAULT_MODEL,
      prompt: 'Summarize findings for operator',
      estimatedCost: 0.01
    });
    edges.push({ source: lastId, target: 'n-summarize' });
  }

  return { nodes, edges };
}
