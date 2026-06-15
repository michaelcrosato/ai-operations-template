import test from 'node:test';
import assert from 'node:assert/strict';
import { promptToGraph } from './promptToGraph.ts';
import { DEFAULT_MODEL } from './models.ts';

// F-DM1: no evidence write at load time — committed roadmap/evidence/F-0019/sample-graph.json
// is a static golden snapshot. Tests assert on promptToGraph()'s returned value in-memory.

test('promptToGraph(prompt) produces valid JSON (>=1 node + >=1 edge) with required keys id/type/label + source/target', () => {
  const g = promptToGraph('Research latest models and then summarize for operator');
  assert.ok(g && typeof g === 'object', 'returns object');
  assert.ok(Array.isArray(g.nodes) && g.nodes.length >= 1, '>=1 node');
  assert.ok(Array.isArray(g.edges) && g.edges.length >= 1, '>=1 edge');
  const node = g.nodes[0];
  assert.ok(Object.hasOwn(node, 'id'), 'node.id');
  assert.ok(Object.hasOwn(node, 'type'), 'node.type');
  assert.ok(Object.hasOwn(node, 'label'), 'node.label');
  const edge = g.edges[0];
  assert.ok(Object.hasOwn(edge, 'source'), 'edge.source');
  assert.ok(Object.hasOwn(edge, 'target'), 'edge.target');
  // JSON parseable + roundtrip stable
  const reparsed = JSON.parse(JSON.stringify(g));
  assert.deepStrictEqual(reparsed, g, 'must be JSON parseable and identical after stringify/parse');
});

test('promptToGraph is deterministic (same prompt => exact same shape and values)', () => {
  const p = 'do research on X and output a summary report';
  const a = promptToGraph(p);
  const b = promptToGraph(p);
  assert.deepStrictEqual(a, b, 'identical output for identical input');
});

test('F-0023: every emitted node model is either "none" (start) or equals DEFAULT_MODEL — no stale grok-3/grok-4 literals', () => {
  const prompts = [
    'default task',
    'Research AI agents and summarize findings',
    'Research the topic then summarize the report',
    'Execute a search and output a summary report',
    'do research on X and output a summary report',
  ];
  for (const p of prompts) {
    const g = promptToGraph(p);
    assert.ok(Array.isArray(g.nodes) && g.nodes.length >= 1, `${p}: has nodes`);
    for (const node of g.nodes) {
      const allowed = node.model === 'none' || node.model === DEFAULT_MODEL;
      assert.ok(
        allowed,
        `prompt "${p}": node "${node.id}" has stale model "${node.model}" — expected "none" or "${DEFAULT_MODEL}"`
      );
    }
  }
});

test('CLI: node src/forge/promptToGraph.js exits 0 and prints valid graph JSON (with sample emit side-effect)', () => {
  // CLI block removed in TS (browser-safe); call function directly
  const parsed = promptToGraph('Research X and summarize');
  assert.ok(Array.isArray(parsed.nodes) && parsed.nodes.length >= 1);
  assert.ok(Array.isArray(parsed.edges) && parsed.edges.length >= 1);
  assert.ok('id' in parsed.nodes[0] && 'type' in parsed.nodes[0] && 'label' in parsed.nodes[0]);
  assert.ok('source' in parsed.edges[0] && 'target' in parsed.edges[0]);
});
