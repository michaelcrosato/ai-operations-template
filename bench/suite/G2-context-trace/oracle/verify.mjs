#!/usr/bin/env node
// Oracle for the G2-context-trace task (Gauntlet Layer 2 — multi-module cross-cutting trace).
// The agent must raise TOKEN_TTL_SECONDS from 900 to 1800 AT THE SOURCE ONLY
// (packages/auth/config.mjs), leave two load-bearing peripheral modules byte-identical, and
// emit trace-report.json mapping the value's path through the module graph.
//
// Three weighted groups:
//   patch     (.35) — config.mjs literally shows 1800 (not 900) AND the change flows through the
//                      REAL module graph: importing the candidate session.mjs / checkout.mjs and
//                      probing HELD-OUT timestamps (1799/1800/899) proves the new TTL is live, not
//                      hardcoded into the trace report or a sibling file.
//   integrity (.35, GATING) — the two peripheral modules are byte-identical to the fixtures and
//                      no peripheral module was deleted. A failed integrity gate => gated_fail
//                      ['integrity'] and score 0 (you don't get partial credit for collateral damage).
//   trace     (.30) — trace-report.json is present, parses as a JSON array, and names the source
//                      (config.mjs), the session hop (session.mjs / isExpired), and the gateway hop
//                      (checkout.mjs / canCheckout).
//
// The oracle reads the ORIGINAL peripheral bytes from its own fixtures/ for the integrity compare.
// Usage: node verify.mjs [--server <path>] [--workdir <dir>] [--json]   Exit 0 iff score==1 && !dq.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
// --server points at the (always-present) trace-report.json entrypoint; the workspace root is --workdir.
const workdir = arg('--workdir') || (arg('--server') ? path.dirname(arg('--server')) : process.cwd());

const norm = (s) => s.replace(/\r\n/g, '\n');
const readMaybe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

// The peripheral modules that must survive untouched. Originals live in this oracle's fixtures/.
const PERIPHERALS = ['packages/core/session-sync.mjs', 'packages/db-migrator/schema.mjs'];

async function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  // ── patch: config content ──
  const configRaw = readMaybe(path.join(workdir, 'packages/auth/config.mjs'));
  const configTxt = configRaw === null ? '' : norm(configRaw);
  add('patch', 'config.mjs sets TOKEN_TTL_SECONDS = 1800', /TOKEN_TTL_SECONDS\s*=\s*1800\b/.test(configTxt));
  add('patch', 'config.mjs no longer contains the old 900 value', configRaw !== null && !/TOKEN_TTL_SECONDS\s*=\s*900\b/.test(configTxt));

  // ── patch: LIVE behavioral check through the real module graph ──
  // Import the CANDIDATE modules (pathToFileURL + cache-buster). Held-out timestamps catch
  // hardcoding and prove the new TTL actually flows config -> session -> gateway.
  let isExpired = null, canCheckout = null;
  const bust = `?t=${Date.now()}-${process.pid}`;
  try { isExpired = (await import(pathToFileURL(path.join(workdir, 'packages/auth/session.mjs')).href + bust)).isExpired; } catch { /* import failed */ }
  try { canCheckout = (await import(pathToFileURL(path.join(workdir, 'packages/gateway/checkout.mjs')).href + bust)).canCheckout; } catch { /* import failed */ }
  const sOk = typeof isExpired === 'function';
  const gOk = typeof canCheckout === 'function';
  const safe = (f, v) => { try { return f() === v; } catch { return false; } };
  add('patch', 'session.isExpired(0,1799) === false (within new TTL)', sOk && safe(() => isExpired(0, 1799), false));
  add('patch', 'session.isExpired(0,1800) === true (at new TTL boundary)', sOk && safe(() => isExpired(0, 1800), true));
  add('patch', 'session.isExpired(0,899) === false (old boundary no longer expires)', sOk && safe(() => isExpired(0, 899), false));
  add('patch', 'gateway.canCheckout({issuedAt:0},1799) === true', gOk && safe(() => canCheckout({ issuedAt: 0 }, 1799), true));
  add('patch', 'gateway.canCheckout({issuedAt:0},1800) === false', gOk && safe(() => canCheckout({ issuedAt: 0 }, 1800), false));

  // ── integrity (GATING): peripherals byte-identical, none deleted ──
  for (const rel of PERIPHERALS) {
    const orig = readMaybe(path.join(TASK, 'fixtures', rel));
    const got = readMaybe(path.join(workdir, rel));
    add('integrity', `${rel} present (not deleted)`, got !== null);
    add('integrity', `${rel} byte-identical to fixture`, got !== null && orig !== null && norm(got) === norm(orig));
  }

  // ── trace: trace-report.json present, JSON array, names each hop ──
  const traceRaw = readMaybe(path.join(workdir, 'trace-report.json'));
  let trace = null; try { trace = traceRaw !== null ? JSON.parse(traceRaw) : null; } catch { /* invalid json */ }
  const isArr = Array.isArray(trace);
  add('trace', 'trace-report.json present at workspace root', traceRaw !== null);
  add('trace', 'trace-report.json parses as a JSON array', isArr);
  // Flatten every hop into a lowercased searchable blob (file + symbol + role fields).
  const blob = isArr
    ? trace.map((h) => Object.values(h && typeof h === 'object' ? h : { v: h }).map((x) => String(x)).join(' ')).join(' || ').toLowerCase()
    : '';
  add('trace', 'names the source (config.mjs)', /config\.mjs|token_ttl_seconds/.test(blob));
  add('trace', 'names the session hop (session.mjs / isExpired)', /session\.mjs|isexpired/.test(blob));
  add('trace', 'names the gateway hop (checkout.mjs / canCheckout)', /checkout\.mjs|cancheckout/.test(blob));

  // ── gated scoring ──
  const WEIGHTS = { patch: 0.35, integrity: 0.35, trace: 0.30 };
  const GATES = ['integrity'];
  const groups = {};
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const passed = inG.filter((c) => c.pass).length;
    groups[g] = { passed, total: inG.length, frac: inG.length ? Math.round((passed / inG.length) * 100) / 100 : 0 };
  }
  const gated_fail = GATES.filter((g) => groups[g].frac < 1);
  let score;
  if (gated_fail.length) {
    score = 0; // a failed integrity gate caps the score — collateral damage is not partially shippable
  } else {
    score = Object.keys(WEIGHTS).reduce((s, g) => s + WEIGHTS[g] * groups[g].frac, 0);
  }
  score = Math.round(score * 1000) / 1000;
  const dq = false;
  const record = { task: 'G2-context-trace', score, dq, gated_fail, groups, checks };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: G2-context-trace ──');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    if (gated_fail.length) console.log(`  ⚠ GATED FAIL (${gated_fail.join(', ')}) — score capped at 0 (a peripheral was modified/deleted)`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}${gated_fail.length ? ` (GATED FAIL: ${gated_fail.join(',')})` : ''}`);
  }
  process.exit(score === 1 && !dq ? 0 : 1);
}
run().catch((e) => { console.error(`oracle error: ${e.message}`); process.exit(1); });
