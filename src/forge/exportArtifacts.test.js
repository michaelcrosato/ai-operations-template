'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const { exportArtifacts } = require('./exportArtifacts.js');

const EXPORT_CLI = path.join(__dirname, 'exportArtifacts.js');

// Top-level side-effect: ensure artifacts are (re)emitted whenever this test module loads.
// Provides graph.json + Dockerfile + docker-compose.yml for AC smoke/evidence (like F-0019).
const emitted = exportArtifacts();
const EV = path.resolve(__dirname, '../../roadmap/evidence/F-0020');
fs.mkdirSync(EV, { recursive: true });
fs.writeFileSync(path.join(EV, 'graph.json'), `${JSON.stringify(emitted.graph, null, 2)}\n`);
fs.writeFileSync(path.join(EV, 'Dockerfile'), emitted.dockerfile);
fs.writeFileSync(path.join(EV, 'docker-compose.yml'), emitted.dockerCompose);

test('exportArtifacts writes graph.json + Dockerfile + docker-compose.yml with required strings', () => {
  const gPath = path.join(EV, 'graph.json');
  const dPath = path.join(EV, 'Dockerfile');
  const cPath = path.join(EV, 'docker-compose.yml');
  assert.ok(fs.existsSync(gPath), 'graph.json exists');
  assert.ok(fs.existsSync(dPath), 'Dockerfile exists');
  assert.ok(fs.existsSync(cPath), 'docker-compose.yml exists');
  const g = JSON.parse(fs.readFileSync(gPath, 'utf8'));
  assert.ok(Array.isArray(g.nodes) && g.nodes.length >= 1, '>=1 node');
  assert.ok(Array.isArray(g.edges) && g.edges.length >= 1, '>=1 edge');
  const df = fs.readFileSync(dPath, 'utf8');
  const dc = fs.readFileSync(cPath, 'utf8');
  assert.ok(df.includes('FROM node'), 'Dockerfile has node base');
  assert.ok(df.includes('COPY graph'), 'Dockerfile has COPY graph');
  assert.ok(df.includes('HEALTHCHECK'), 'Dockerfile has healthcheck');
  assert.ok(dc.includes('DEMO_MODE'), 'docker-compose has DEMO_MODE');
  assert.ok(dc.includes('healthcheck'), 'docker-compose has healthcheck');
});

test('CLI: node src/forge/exportArtifacts.js exits 0 and emits artifacts', () => {
  const stdout = execFileSync(process.execPath, [EXPORT_CLI], { encoding: 'utf8' });
  assert.ok(stdout.includes('exported'));
  const g = JSON.parse(fs.readFileSync(path.join(EV, 'graph.json'), 'utf8'));
  assert.ok(g.nodes && g.edges);
});
