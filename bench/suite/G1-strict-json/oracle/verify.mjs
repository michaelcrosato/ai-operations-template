#!/usr/bin/env node
// Oracle for the G1 strict-JSON task (Gauntlet Layer 1 — strict-JSON / negative-constraint trap).
// Tests OUTPUT DISCIPLINE: the deliverable must be a MINIFIED JSON object (one line, exact key
// order, schema_version "1.0"), with NO markdown fences and NO extra files, plus the correct
// account-filtering transform applied to accounts.csv.
//
// This oracle does THREE things:
//   1. ANTI-CHEAT (hard DQ → score 0): the agent must not alter accounts.csv. A norm-compare
//      against the original fixture; any difference = dq, score 0.
//   2. FORMAT (.4, partial): file exists, parses, raw bytes are a minified single-line JSON with
//      no code fence, the exact ordered top-level keys, and exactly ONE new file beyond accounts.csv.
//   3. CORRECTNESS (.6, partial): schema_version, valid_accounts (ordered deep-equal),
//      rejected_rows (row_number set + reasons), summary counts, disabled rows in neither array.
//
// EXPECTED is computed by parsing THIS oracle's own fixtures/accounts.csv with the same transform —
// never hardcoded. Usage: node verify.mjs [--server <path>] [--workdir <dir>] [--json]. Exit 0 iff
// score == 1.0 and not dq.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TASK = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const asJson = argv.includes('--json');
// --server points at benchmark-output.json (meta.entrypoint); the workdir is where everything lives.
const workdir = arg('--workdir') || (arg('--server') ? path.dirname(arg('--server')) : process.cwd());

const norm = (s) => s.replace(/\r\n/g, '\n');
const readMaybe = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

const PLANS = new Set(['free', 'pro', 'enterprise']);
const TRUE_SET = new Set(['true', '1', 'yes']);   // case-insensitive (TRUE/true/1/yes)

// Parse a simple, comma-delimited CSV (no embedded commas/quotes — task fixture is kept simple).
function parseCsv(raw) {
  const lines = norm(raw).split('\n').filter((l, i) => !(i > 0 && l.trim() === '') || i === 0);
  // Drop a single trailing empty line (from a final newline) but keep intentional blank fields.
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const rows = lines.slice(1).map((l) => l.split(','));
  return rows.map((cells) => ({
    account_id: (cells[0] ?? '').trim(),
    email: (cells[1] ?? '').trim(),
    plan: (cells[2] ?? '').trim(),
    enabled: (cells[3] ?? '').trim(),
  }));
}

function isEnabled(v) { return TRUE_SET.has(v.toLowerCase()); }

// The transform — applied to accounts.csv to produce the EXPECTED output object.
function transform(rows) {
  const valid_accounts = [];
  const rejected_rows = [];
  rows.forEach((r, i) => {
    const row_number = i + 1; // 1-based among ALL data rows, including disabled
    if (!isEnabled(r.enabled)) return; // disabled → excluded from BOTH arrays
    let reason = null;
    if (!r.account_id) reason = 'missing_account_id';
    else if ((r.email.match(/@/g) || []).length !== 1) reason = 'invalid_email';
    else if (!PLANS.has(r.plan)) reason = 'invalid_plan';
    if (reason) rejected_rows.push({ row_number, account_id: r.account_id, reason });
    else valid_accounts.push({ account_id: r.account_id, email: r.email, plan: r.plan });
  });
  return {
    schema_version: '1.0',
    valid_accounts,
    rejected_rows,
    summary: { input_rows: rows.length, accepted: valid_accounts.length, rejected: rejected_rows.length },
  };
}

// Shallow noise we never count as a "new file" the agent created.
const NOISE = new Set(['node_modules', '.git', '.DS_Store', 'package-lock.json']);

function run() {
  const checks = [];
  const add = (group, name, pass) => checks.push({ group, name, pass: !!pass });

  // ── anti-cheat: accounts.csv must be byte-identical (norm) to the fixture ──
  const origCsv = readMaybe(path.join(TASK, 'fixtures', 'accounts.csv'));
  const wdCsv = readMaybe(path.join(workdir, 'accounts.csv'));
  const cheats = [];
  if (wdCsv === null) cheats.push('deleted accounts.csv');
  else if (origCsv !== null && norm(wdCsv) !== norm(origCsv)) cheats.push('altered accounts.csv vs the fixture');
  const dq = cheats.length > 0;

  const expected = transform(parseCsv(origCsv || ''));

  // ── format group (.4) ──
  const outPath = path.join(workdir, 'benchmark-output.json');
  const raw = readMaybe(outPath);
  add('format', 'benchmark-output.json exists', raw !== null);

  let parsed = null;
  try { parsed = raw !== null ? JSON.parse(raw) : null; } catch { parsed = null; }
  add('format', 'raw bytes JSON.parse OK', parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed));

  add('format', 'no markdown code fence ("```") in raw output', raw !== null && !raw.includes('```'));

  const trimmed = raw !== null ? norm(raw).trim() : '';
  add('format', 'minified (single line, no "\\n", no double-space)',
    raw !== null && !trimmed.includes('\n') && !trimmed.includes('  '));

  const keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : [];
  const KEY_ORDER = ['schema_version', 'valid_accounts', 'rejected_rows', 'summary'];
  add('format', 'top-level keys exactly + ordered [schema_version,valid_accounts,rejected_rows,summary]',
    keys.length === KEY_ORDER.length && keys.every((k, i) => k === KEY_ORDER[i]));

  // exactly ONE new file beyond accounts.csv (ignore node_modules/.git noise, shallow at root)
  let rootEntries = [];
  try { rootEntries = fs.readdirSync(workdir, { withFileTypes: true }); } catch { /* unreadable */ }
  const newFiles = rootEntries
    .filter((e) => !NOISE.has(e.name) && !e.isDirectory() && e.name !== 'accounts.csv')
    .map((e) => e.name);
  add('format', 'exactly one new file created beyond accounts.csv',
    newFiles.length === 1 && newFiles[0] === 'benchmark-output.json');

  // ── correctness group (.6) ──
  const obj = parsed && typeof parsed === 'object' ? parsed : {};
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  add('correctness', 'schema_version === "1.0"', obj.schema_version === '1.0');

  add('correctness', 'valid_accounts deep-equals expected (ordered)',
    Array.isArray(obj.valid_accounts) && eq(obj.valid_accounts, expected.valid_accounts));

  // rejected_rows: row_number set must match AND each reason must be correct + from the vocab.
  const VOCAB = new Set(['missing_account_id', 'invalid_email', 'invalid_plan']);
  const gotRej = Array.isArray(obj.rejected_rows) ? obj.rejected_rows : [];
  const expByRow = new Map(expected.rejected_rows.map((r) => [r.row_number, r]));
  const gotRows = gotRej.map((r) => r && r.row_number).filter((n) => n !== undefined);
  const rowSetMatch = gotRows.length === expected.rejected_rows.length &&
    new Set(gotRows).size === gotRows.length &&
    expected.rejected_rows.every((r) => gotRows.includes(r.row_number));
  add('correctness', 'rejected_rows row_number set matches expected', rowSetMatch);

  const reasonsMatch = gotRej.length === expected.rejected_rows.length &&
    gotRej.every((r) => {
      const e = r && expByRow.get(r.row_number);
      return e && VOCAB.has(r.reason) && r.reason === e.reason && r.account_id === e.account_id;
    });
  add('correctness', 'rejected_rows reasons match expected (vocab + correct + precedence)', reasonsMatch);

  add('correctness', 'summary counts correct (input_rows/accepted/rejected)',
    obj.summary && eq(obj.summary, expected.summary));

  // disabled rows appear in NEITHER array (row_numbers of disabled rows must be absent everywhere)
  const allRows = parseCsv(origCsv || '');
  const disabledRowNums = allRows.map((r, i) => ({ n: i + 1, on: isEnabled(r.enabled) })).filter((x) => !x.on).map((x) => x.n);
  const validIds = new Set((allRows.filter((r, i) => isEnabled(r.enabled)).map((r) => r.account_id)));
  const rejRowNums = new Set(gotRows);
  // a disabled row contributes neither a rejected row_number nor a valid account that only it could supply.
  const disabledAccountIds = new Set(allRows.filter((r, i) => disabledRowNums.includes(i + 1)).map((r) => r.account_id).filter(Boolean));
  const gotValidIds = new Set(Array.isArray(obj.valid_accounts) ? obj.valid_accounts.map((a) => a && a.account_id) : []);
  const leakedDisabled = disabledRowNums.some((n) => rejRowNums.has(n)) ||
    [...disabledAccountIds].some((id) => gotValidIds.has(id) && !validIds.has(id));
  add('correctness', 'disabled rows in neither valid_accounts nor rejected_rows', !leakedDisabled);

  // ── weighted scoring ──
  const WEIGHTS = { format: 0.4, correctness: 0.6 };
  const groups = {};
  let score = 0;
  for (const g of Object.keys(WEIGHTS)) {
    const inG = checks.filter((c) => c.group === g);
    const frac = inG.length ? inG.filter((c) => c.pass).length / inG.length : 0;
    groups[g] = { passed: inG.filter((c) => c.pass).length, total: inG.length, frac: Math.round(frac * 100) / 100 };
    score += WEIGHTS[g] * frac;
  }
  score = dq ? 0 : Math.round(score * 1000) / 1000;
  const record = { task: 'G1-strict-json', score, dq, gated_fail: dq ? ['anti-cheat'] : [], cheats, groups, checks };

  if (asJson) process.stdout.write(`${JSON.stringify(record)}\n`);
  else {
    console.log('── oracle: G1-strict-json ──');
    if (dq) console.log(`  ⚠ DQ (anti-cheat): ${cheats.join('; ')}`);
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} [${c.group}] ${c.name}`);
    console.log(`\n  groups: ${Object.entries(groups).map(([g, v]) => `${g} ${v.passed}/${v.total}`).join(' · ')}`);
    console.log(`  SCORE: ${score}${dq ? '  (disqualified)' : ''}`);
  }
  process.exit(score === 1 && !dq ? 0 : 1);
}
run();
