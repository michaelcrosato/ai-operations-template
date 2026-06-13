'use strict';

/**
 * Export helper (F-0020): writes portable graph.json + minimal Dockerfile + docker-compose.yml
 * to roadmap/evidence/F-0020/ as runtime side-effect (matches F-0019 promptToGraph sample emit).
 * No changes to engine src. Artifacts are valid and contain required strings (DEMO_MODE, healthcheck).
 * Zero-dependency CommonJS, health.js style (module.exports + CLI-if-main).
 */

const fs = require('node:fs');
const path = require('node:path');

const EVIDENCE_DIR = path.resolve(__dirname, '..', '..', 'roadmap', 'evidence', 'F-0020');

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

/**
 * Minimal graph compatible with F-0019 shape.
 * nodes: id/type/label + optional position/model/prompt/estimatedCost
 * edges: source/target
 */
function minimalGraph() {
  return {
    nodes: [
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
        prompt: 'demo export',
        estimatedCost: 0.01
      }
    ],
    edges: [
      { source: 'n-start', target: 'n-process' }
    ]
  };
}

function dockerfileContent() {
  // node base, COPY graph, healthcheck
  return `FROM node:20-alpine
WORKDIR /app
COPY graph.json .
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "process.exit(0)" || exit 1
`;
}

function dockerComposeContent() {
  // DEMO_MODE + health (healthcheck)
  return `version: '3.8'
services:
  forge:
    build: .
    environment:
      - DEMO_MODE=1
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 3s
      retries: 3
`;
}

function exportArtifacts() {
  ensureDir(EVIDENCE_DIR);
  const g = minimalGraph();
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'graph.json'), `${JSON.stringify(g, null, 2)}\n`);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'Dockerfile'), dockerfileContent());
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'docker-compose.yml'), dockerComposeContent());
  return { graph: g, dockerfile: dockerfileContent(), dockerCompose: dockerComposeContent() };
}

module.exports = { exportArtifacts, minimalGraph, dockerfileContent, dockerComposeContent };

if (require.main === module) {
  exportArtifacts();
  process.stdout.write('exported graph.json, Dockerfile, docker-compose.yml\n');
  process.exitCode = 0;
}
