#!/usr/bin/env node
// Oracle for the L4 CRM-API task — an HTTP acceptance suite with GATING criteria.
// Launches the candidate server, exercises it over HTTP, and scores it. No LLM judge.
//
//   PRIMARY (.35, partial credit)     — CRUD + filter round-trips (create→read-back kills hardcoding).
//   GATING-RBAC (.30, PASS-REQUIRED)  — a viewer must NOT be able to write. Fail any → score 0, insecure.
//   GATING-INTEGRITY (.20, REQUIRED)  — referential integrity (409 on dangling refs / delete-with-deals).
//   VALIDATION/HELD-OUT (.15, partial)— input validation + altered cases the agent didn't see.
//
// A failed GATING criterion CAPS the score at 0 (a CRM with broken RBAC is not "65% shippable").
// Usage: node verify.mjs [--server <path>] [--workdir <dir>] [--json]

import { spawn } from 'node:child_process';
import nodeHttp from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
const serverPath = arg('--server') || path.join(TASK, 'solution', 'server.mjs');
const workdir = arg('--workdir') || path.dirname(serverPath);

// Robust launch: assign a known PORT and HEALTH-POLL the server until it answers, rather than
// scraping an exact stdout line (a correct server that logs differently must not false-fail —
// task validity). stdio ignored so no pipe can fill/block and teardown stays clean.
async function launch() {
  const port = 20000 + (process.pid % 20000);
  const child = spawn('node', [serverPath], { cwd: workdir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'ignore'] });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return { child, port: null }; // crashed on startup
    const h = await http(base, 'GET', '/health', {});
    if (h.status === 200) return { child, port };
    await new Promise((r) => setTimeout(r, 200));
  }
  return { child, port: null };
}

// Windows-safe shutdown: forcing process.exit() while the child's stdio pipes are mid-close
// trips a libuv assertion. Wait for the child to fully `close`, THEN exit (with a hard fallback).
function finish(child, code) {
  let exited = false;
  const bail = () => { if (!exited) { exited = true; process.exit(code); } };
  child.once('close', bail);
  setTimeout(bail, 2500).unref();
  try { child.kill(); } catch { /* already gone */ }
}

// Raw node:http with agent:false — no keep-alive pool, so every socket closes after its
// response. (fetch/undici kept sockets alive and tripped a libuv teardown assert on Windows.)
function http(base, method, p, { role, body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(`${base}${p}`);
    const data = body !== undefined ? JSON.stringify(body) : null;
    const headers = { connection: 'close' };
    if (role) headers['x-role'] = role;
    if (data) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(data); }
    const req = nodeHttp.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, agent: false, timeout: 4000 }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => { let json = null; try { json = raw ? JSON.parse(raw) : null; } catch { /* non-json */ } resolve({ status: res.statusCode, json }); });
    });
    req.on('error', () => resolve({ status: 0, json: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, json: null }); });
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const { child, port } = await launch();
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  if (!port) {
    add('primary', 'server starts and listens', false);
  } else {
    const base = `http://127.0.0.1:${port}`;
    // PRIMARY — CRUD + filter round-trips
    const create = await http(base, 'POST', '/contacts', { role: 'owner', body: { name: 'Ada', email: 'ada@example.com' } });
    add('primary', 'owner POST /contacts → 201 with id', create.status === 201 && create.json?.id);
    const cid = create.json?.id;
    const read = await http(base, 'GET', `/contacts/${cid}`, { role: 'viewer' });
    add('primary', 'GET /contacts/:id round-trips the created contact', read.status === 200 && read.json?.name === 'Ada');
    const upd = await http(base, 'PUT', `/contacts/${cid}`, { role: 'editor', body: { name: 'Ada Lovelace' } });
    add('primary', 'editor PUT /contacts/:id updates', upd.status === 200 && upd.json?.name === 'Ada Lovelace');
    const deal = await http(base, 'POST', '/deals', { role: 'owner', body: { contactId: cid, stage: 'open', amount: 100 } });
    add('primary', 'owner POST /deals → 201', deal.status === 201 && deal.json?.id);
    const fOpen = await http(base, 'GET', '/deals?stage=open', { role: 'viewer' });
    const fWon = await http(base, 'GET', '/deals?stage=won', { role: 'viewer' });
    add('primary', 'GET /deals?stage= filters correctly', Array.isArray(fOpen.json) && fOpen.json.length === 1 && Array.isArray(fWon.json) && fWon.json.length === 0);

    // GATING — RBAC (a viewer must not write)
    add('rbac', 'viewer POST /contacts → 403', (await http(base, 'POST', '/contacts', { role: 'viewer', body: { name: 'X', email: 'x@x.com' } })).status === 403);
    add('rbac', 'viewer PUT /contacts/:id → 403', (await http(base, 'PUT', `/contacts/${cid}`, { role: 'viewer', body: { name: 'Z' } })).status === 403);
    add('rbac', 'viewer DELETE /contacts/:id → 403', (await http(base, 'DELETE', `/contacts/${cid}`, { role: 'viewer' })).status === 403);
    add('rbac', 'viewer POST /deals → 403', (await http(base, 'POST', '/deals', { role: 'viewer', body: { contactId: cid, stage: 'open' } })).status === 403);

    // GATING — referential integrity
    add('integrity', 'DELETE contact with a deal → 409', (await http(base, 'DELETE', `/contacts/${cid}`, { role: 'owner' })).status === 409);
    add('integrity', 'POST /deals with unknown contactId → 409', (await http(base, 'POST', '/deals', { role: 'owner', body: { contactId: '99999', stage: 'open' } })).status === 409);

    // VALIDATION / held-out (altered cases)
    add('validation', 'POST /contacts missing name → 400', (await http(base, 'POST', '/contacts', { role: 'owner', body: { email: 'a@b.com' } })).status === 400);
    add('validation', 'POST /contacts bad email → 400', (await http(base, 'POST', '/contacts', { role: 'owner', body: { name: 'NoEmail', email: 'nope' } })).status === 400);
    add('validation', 'unknown route → 404', (await http(base, 'GET', '/nonsense', { role: 'owner' })).status === 404);
    // held-out: a delete that SHOULD succeed (proves 409 is conditional, not hardcoded)
    const c2 = await http(base, 'POST', '/contacts', { role: 'owner', body: { name: 'Temp', email: 't@e.com' } });
    add('validation', 'DELETE contact with no deals → 204 (409 is conditional)', (await http(base, 'DELETE', `/contacts/${c2.json?.id}`, { role: 'owner' })).status === 204);
  }
  // ── gated scoring ──
  const WEIGHTS = { primary: 0.35, rbac: 0.30, integrity: 0.20, validation: 0.15 };
  const GATES = ['rbac', 'integrity'];
  const groups = {};
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    groups[g] = { passed: inG.filter((c) => c.pass).length, total: inG.length, frac: inG.length ? inG.filter((c) => c.pass).length / inG.length : 0 };
  }
  const failedGates = GATES.filter((g) => groups[g].frac < 1);
  let score;
  if (failedGates.length) {
    score = 0; // a failed security/integrity gate caps the score — NOT averaged away
  } else {
    score = Object.keys(WEIGHTS).reduce((s, g) => s + WEIGHTS[g] * groups[g].frac, 0);
  }
  score = Math.round(score * 1000) / 1000;
  const record = { task: 'L4-crm-api', score, gated_fail: failedGates, dq: false, groups, checks, server: path.relative(TASK, serverPath) };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: L4-crm-api ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    if (failedGates.length) console.log(`  ⚠ GATED FAIL (${failedGates.join(', ')}) — score capped at 0 (insecure/broken-integrity build is not partially shippable)`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}${failedGates.length ? ` (GATED FAIL: ${failedGates.join(',')})` : ''}`);
  }
  finish(child, score === 1 ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
