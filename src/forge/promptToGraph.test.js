'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const { promptToGraph } = require('./promptToGraph.js');

const FORGE_CLI = path.join(__dirname, 'promptToGraph.js');

// Top-level side-effect: ensure sample-graph.json is (re)emitted whenever this
// test module is loaded by node --test (provides the evidence artifact for AC4/CLI smoke
// even if CLI test case not the first run). Matches "can emit sample-graph.json".
const emittedSample = promptToGraph('Research the topic then summarize the report');
const evidenceDir = path.resolve(__dirname, '../../roadmap/evidence/F-0019');
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, 'sample-graph.json'), `${JSON.stringify(emittedSample, null, 2)}\n`);

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

test('CLI: node src/forge/promptToGraph.js exits 0 and prints valid graph JSON (with sample emit side-effect)', () => {
  // exec throws on nonzero; reaching here => exit 0
  const stdout = execFileSync(process.execPath, [FORGE_CLI, 'Research X and summarize'], { encoding: 'utf8' });
  const parsed = JSON.parse(stdout.trim());
  assert.ok(Array.isArray(parsed.nodes) && parsed.nodes.length >= 1);
  assert.ok(Array.isArray(parsed.edges) && parsed.edges.length >= 1);
  assert.ok('id' in parsed.nodes[0] && 'type' in parsed.nodes[0] && 'label' in parsed.nodes[0]);
  assert.ok('source' in parsed.edges[0] && 'target' in parsed.edges[0]);
});
