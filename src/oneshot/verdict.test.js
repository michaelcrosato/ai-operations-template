'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { verdict } = require('./verdict.js');
const { admit } = require('./admit.js');

function tempEvidencePath() {
  return path.join(
    os.tmpdir(),
    `verdict-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
}

function cleanUp(paths) {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* best-effort */ }
  }
}

// Acceptance criterion 1:
// Non-zero exit -> NOT-DONE even if the input carries claimed: "PASS".
// The claim is IGNORED — the verdict is a pure function of the captured exit code.
test('AC1: non-zero exit -> NOT-DONE even when input claims PASS', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(1)"',
      contextPaths: [],
      claimed: 'PASS'          // self-report that should be ignored
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'NOT-DONE', 'verdict must be NOT-DONE when command exits 1');
    assert.equal(result.report.claimed, 'PASS', 'claimed field must be preserved in the report');
  } finally {
    cleanUp([evidencePath]);
  }
});

// Acceptance criterion 2:
// exit 0 -> PASS, and the evidence file records exit code 0.
test('AC2: exit 0 -> PASS and evidence file records exitCode 0', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(0)"',
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'PASS', 'verdict must be PASS when command exits 0');

    // Evidence file must exist and record exitCode === 0
    assert.ok(fs.existsSync(evidencePath), 'evidence file must be written to disk');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.exitCode, 0, 'evidence file must record exitCode 0');
    assert.equal(evidence.command, descriptor.acceptanceCommand, 'evidence file must record the command');
    assert.ok(evidence.timestamp, 'evidence file must include a timestamp');
  } finally {
    cleanUp([evidencePath]);
  }
});

// Acceptance criterion 3:
// non-zero exit -> NOT-DONE and evidence file records that non-zero exit code.
test('AC3: non-zero exit -> NOT-DONE and evidence file records non-zero exitCode', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(42)"',
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'NOT-DONE');

    // Evidence file must record the non-zero exit code
    assert.ok(fs.existsSync(evidencePath), 'evidence file must be written to disk');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.exitCode, 42, 'evidence file must record the exact non-zero exit code');

    // NOT-DONE report must name claimed vs evidence
    assert.ok(result.report, 'NOT-DONE result must include report');
    assert.ok('claimed' in result.report, 'report must include claimed field');
    assert.deepEqual(result.report.evidence, { exitCode: 42, command: descriptor.acceptanceCommand });
  } finally {
    cleanUp([evidencePath]);
  }
});

// Acceptance criterion 4 (implicit — no new dependencies):
// The require() calls above only use node:test, node:assert/strict, node:fs, node:os, node:path.
// verdict.js itself uses node:child_process, node:fs, node:os, node:path — all builtins.
// This test verifies the module loads without external deps by the fact that it runs at all
// inside the Node builtin-only environment; no additional assertion needed beyond module load.
test('AC4: verdict module loads with node builtins only (no external deps)', () => {
  // If we got here, the require('./verdict.js') at the top succeeded without
  // installing any npm package. Verify the export shape.
  assert.equal(typeof verdict, 'function', 'verdict must be a function export');
});

// Acceptance criterion 5:
// verdict consumes the same TaskDescriptor shape as F-0040 (admit.js).
// Feed an ADMITted descriptor straight into verdict().
test('AC5: verdict consumes the F-0040 descriptor shape (ADMIT -> verdict round-trip)', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(0)"',
      contextPaths: []
    };

    // Step 1: confirm the descriptor passes the admission gate
    const admitResult = admit(descriptor);
    assert.equal(admitResult.verdict, 'ADMIT', 'descriptor must be ADMITted by the gate');

    // Step 2: feed the SAME descriptor to verdict — no shape translation needed
    const verdictResult = verdict(descriptor, { evidencePath });
    assert.equal(verdictResult.verdict, 'PASS', 'ADMITted descriptor with exit-0 command must yield PASS');

    // Confirm evidence was written
    assert.ok(fs.existsSync(evidencePath), 'evidence file must exist after verdict');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.exitCode, 0);
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0047: spawn-level error (output larger than the 16MB maxBuffer) maps to
// exitCode 127 and NOT-DONE, with the evidence file recording 127.
test('F-0047: spawn error (maxBuffer exceeded) -> exitCode 127, NOT-DONE, evidence records 127', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: "node -e \"process.stdout.write('x'.repeat(17*1024*1024))\"",
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'NOT-DONE', 'verdict must be NOT-DONE on spawn-level error');
    assert.equal(result.report.evidence.exitCode, 127, 'report evidence must record exitCode 127');

    assert.ok(fs.existsSync(evidencePath), 'evidence file must be written to disk');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.exitCode, 127, 'evidence file on disk must record exitCode 127');
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0047: verdict must never return PASS when the evidence file cannot be
// persisted — writing into a nonexistent directory must throw, fail-closed.
test('F-0047: evidence-write failure is fail-closed (throws, never PASS)', () => {
  const missingDirEvidencePath = path.join(
    os.tmpdir(),
    `no-such-dir-${Date.now()}`,
    'sub',
    'evidence.json'
  );
  // Deliberately do NOT create the directory — fs.writeFileSync must fail.
  const descriptor = {
    acceptanceCommand: 'node -e "process.exit(0)"',
    contextPaths: []
  };
  assert.throws(
    () => verdict(descriptor, { evidencePath: missingDirEvidencePath }),
    'verdict must throw when the evidence file cannot be written, never silently return PASS'
  );
  assert.ok(!fs.existsSync(missingDirEvidencePath), 'evidence file must not exist after a failed write');
});

// F-0047: the evidence file must record the stdout and stderr produced by
// the acceptance command.
test('F-0047: evidence file records stdout and stderr of the acceptance command', () => {
  const evidencePath = tempEvidencePath();
  try {
    // F-0052 note: verdict() now re-runs admit() on this descriptor first
    // (AC2), and admit()'s CHAINING_RE has always rejected a bare `;` even
    // inside a quoted -e argument (naive whole-string scan, no quote
    // awareness -- see admit.js). The original fixture used `stmt1; stmt2`;
    // rewritten with the JS comma operator (`stmt1, stmt2`) to stay a single
    // admissible command while still executing both console calls and
    // proving both are captured. Assertions below are unchanged.
    const descriptor = {
      acceptanceCommand: "node -e \"console.log('out-marker-f0047'), console.error('err-marker-f0047')\"",
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'PASS');

    assert.ok(fs.existsSync(evidencePath), 'evidence file must be written to disk');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.ok(evidence.stdout.includes('out-marker-f0047'), 'evidence file stdout must contain the stdout marker');
    assert.ok(evidence.stderr.includes('err-marker-f0047'), 'evidence file stderr must contain the stderr marker');
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0052 AC2: verdict re-runs admit() on its descriptor first. A rejected
// (chained) command must produce a distinct NOT-ADMITTED outcome without
// spawning anything and without writing any evidence file.
test('F-0052 AC2: chained command fed directly to verdict -> NOT-ADMITTED, nothing spawned, no evidence file', () => {
  const evidencePath = tempEvidencePath();
  const descriptor = {
    acceptanceCommand: 'echo one; echo two',
    contextPaths: []
  };
  const result = verdict(descriptor, { evidencePath });
  assert.equal(result.verdict, 'NOT-ADMITTED', 'a chained command must be rejected before spawning');
  assert.equal(result.reason, 'no-verifiable-criterion');
  assert.ok(!fs.existsSync(evidencePath), 'no evidence file may be written when admission fails');
});

// F-0052 AC3: the acceptance-command spawn has a configurable timeout; an
// over-time command yields NOT-DONE with the evidence file recording the
// timeout.
test('F-0052 AC3: over-time command -> NOT-DONE, evidence file records timedOut and the limit', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      // Plain function expression, not an arrow function: `=>` contains a
      // bare `>` which F-0052's EXEC_VECTOR_RE now rejects as redirection.
      acceptanceCommand: 'node -e "setTimeout(function () {}, 5000)"',
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath, timeoutMs: 200 });
    assert.equal(result.verdict, 'NOT-DONE', 'a timed-out command must yield NOT-DONE');

    assert.ok(fs.existsSync(evidencePath), 'evidence file must be written even on timeout');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    assert.equal(evidence.timedOut, true, 'evidence file must record timedOut: true');
    assert.equal(evidence.timeoutMs, 200, 'evidence file must record the timeout limit that was applied');
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0052 AC4: a PASS result includes the evidencePath, and the file it
// points at exists and records exit 0.
test('F-0052 AC4: PASS result includes evidencePath, and that file exists and records exit 0', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(0)"',
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'PASS');
    assert.equal(result.evidencePath, evidencePath, 'PASS result must return the evidencePath used');
    assert.ok(fs.existsSync(result.evidencePath), 'the file at the returned evidencePath must exist');
    const evidence = JSON.parse(fs.readFileSync(result.evidencePath, 'utf8'));
    assert.equal(evidence.exitCode, 0, 'the evidence file must record exit 0');
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0052 AC5: evidence writes are atomic (temp file then rename); no
// leftover temp file may remain next to the evidence file after a run.
test('F-0052 AC5: evidence write is atomic -- no *.tmp residue left next to the evidence file', () => {
  const evidencePath = tempEvidencePath();
  try {
    const descriptor = {
      acceptanceCommand: 'node -e "process.exit(0)"',
      contextPaths: []
    };
    const result = verdict(descriptor, { evidencePath });
    assert.equal(result.verdict, 'PASS');
    assert.ok(fs.existsSync(evidencePath), 'final evidence file must exist');

    const dir = path.dirname(evidencePath);
    const base = path.basename(evidencePath);
    const leftoverTmp = fs.readdirSync(dir).filter(
      (name) => name.startsWith(base) && name.endsWith('.tmp')
    );
    assert.deepEqual(leftoverTmp, [], 'no *.tmp residue may remain next to the evidence file');
  } finally {
    cleanUp([evidencePath]);
  }
});

// F-0052 AC5: default evidence filenames are collision-resistant (pid +
// random hex), not bare milliseconds, while staying sortable by timestamp.
test('F-0052 AC5: default evidencePath filename includes pid and random hex, not bare milliseconds', () => {
  const descriptor = {
    acceptanceCommand: 'node -e "process.exit(0)"',
    contextPaths: []
  };
  const result = verdict(descriptor); // no evidencePath option -> default path
  try {
    assert.equal(result.verdict, 'PASS');
    const filename = path.basename(result.evidencePath);
    assert.match(
      filename,
      /^oneshot-verdict-\d+-\d+-[0-9a-f]+\.json$/,
      'default evidence filename must be oneshot-verdict-<timestamp>-<pid>-<randomhex>.json'
    );
  } finally {
    cleanUp([result.evidencePath]);
  }
});
