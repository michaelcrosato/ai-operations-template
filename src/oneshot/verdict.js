'use strict';

/**
 * Evidence-gated verdict for the one-shot tool (F-0041).
 *
 * After a bounded attempt on an admitted task, the verdict RUNS the task's
 * acceptance command, captures the REAL exit code to an evidence file, and
 * returns PASS only when that captured exit code is 0.
 *
 * F-0052: before running anything, verdict re-runs the F-0040 admission gate
 * on the same descriptor/options. An acceptance command that would be
 * REJECTed by admit() (chaining, command substitution, redirection, etc.)
 * is never spawned by verdict() either — verdict is not a bypass route
 * around admission.
 *
 * ## API
 *
 * @typedef {import('./admit.js').TaskDescriptor} TaskDescriptor
 *
 * @typedef {Object} VerdictOptions
 * @property {string} [evidencePath]
 *   Absolute or relative path for the evidence JSON file.
 *   Defaults to a collision-resistant file in the OS temp directory.
 * @property {number} [timeoutMs]
 *   Wall-clock timeout for the acceptance-command spawn, in milliseconds.
 *   Defaults to DEFAULT_TIMEOUT_MS (10 minutes = 600000 ms) — the same
 *   documented-default pattern as admit.js's DEFAULT_TOKEN_BUDGET.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { admit } = require('./admit.js');

/**
 * Default acceptance-command spawn timeout: 10 minutes.
 * Long enough for a real verification command (build/test run), short enough
 * that a hung acceptance command cannot stall the harness indefinitely.
 */
const DEFAULT_TIMEOUT_MS = 600000;

/**
 * Default evidence path: OS temp dir, collision-resistant filename
 * (pid + random hex alongside the timestamp so concurrent runs on the same
 * machine in the same millisecond cannot collide), kept sortable by
 * leading-timestamp.
 * @returns {string}
 */
function defaultEvidencePath() {
  const rand = crypto.randomBytes(4).toString('hex');
  return path.join(
    os.tmpdir(),
    `oneshot-verdict-${Date.now()}-${process.pid}-${rand}.json`
  );
}

/**
 * Write JSON to `finalPath` atomically: write to a sibling temp file in the
 * same directory, then rename over the final path. Never silently creates
 * missing parent directories — a missing evidence directory must still
 * throw (fail-closed), matching the pre-F-0052 fail-closed contract.
 *
 * @param {string} finalPath
 * @param {object} data
 */
function writeEvidenceAtomic(finalPath, data) {
  const dir = path.dirname(finalPath);
  const tmpPath = path.join(
    dir,
    `${path.basename(finalPath)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  );
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, finalPath);
}

/**
 * Run the acceptance command, write an evidence file, and return a verdict.
 *
 * The verdict is a PURE FUNCTION of the captured exit code from the
 * acceptance command. Any self-reported 'claimed' field in the descriptor
 * is recorded in NOT-DONE reports for transparency but is NEVER consulted
 * to decide between PASS and NOT-DONE.
 *
 * @param {TaskDescriptor & { claimed?: string }} descriptor
 * @param {VerdictOptions} [options]
 * @returns {{ verdict: 'NOT-ADMITTED', reason: string }
 *          | { verdict: 'PASS', evidencePath: string }
 *          | { verdict: 'NOT-DONE', evidencePath: string, report: { claimed: string, evidence: { exitCode: number, command: string } } }}
 */
function verdict(descriptor, options) {
  // F-0052: re-run admission first. A descriptor that would be REJECTed by
  // admit() must not be spawned, and must not produce an evidence file.
  const admitResult = admit(descriptor, options);
  if (admitResult.verdict === 'REJECT') {
    return { verdict: 'NOT-ADMITTED', reason: admitResult.reason };
  }

  const command = descriptor.acceptanceCommand;
  const evidencePath = options?.evidencePath ? options.evidencePath : defaultEvidencePath();
  const timeoutMs = (options && typeof options.timeoutMs === 'number')
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;

  // Run the acceptance command as a shell command; shell:true lets it work
  // exactly as the user would type it (and mirrors how capture.mjs runs gates).
  const res = spawnSync(command, [], {
    shell: true,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: timeoutMs
  });

  // Treat spawn error or signal-termination as non-zero (not done). A timed
  // -out spawn is reported distinctly (res.error.code === 'ETIMEDOUT') so the
  // evidence file can record it, separately from other spawn-level errors
  // (e.g. maxBuffer exceeded), which keep the pre-existing exitCode 127.
  let exitCode;
  let timedOut = false;
  if (res.error && res.error.code === 'ETIMEDOUT') {
    timedOut = true;
    exitCode = 124; // conventional timeout exit code (GNU coreutils `timeout`)
  } else if (res.error) {
    exitCode = 127;
  } else if (res.status === null) {
    exitCode = 1;
  } else {
    exitCode = res.status;
  }

  // Write the evidence record unconditionally — the captured exit code is
  // the authoritative truth; the file persists regardless of pass/fail.
  // Written atomically (temp file + rename in the same directory) so a
  // reader never observes a partially-written evidence file.
  const evidence = {
    command,
    exitCode,
    timestamp: new Date().toISOString(),
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    timedOut,
    timeoutMs
  };
  writeEvidenceAtomic(evidencePath, evidence);

  if (exitCode === 0) {
    return { verdict: 'PASS', evidencePath };
  }

  const claimed = (descriptor.claimed !== undefined ? String(descriptor.claimed) : 'unknown');
  return {
    verdict: 'NOT-DONE',
    evidencePath,
    report: {
      claimed,
      evidence: { exitCode, command }
    }
  };
}

module.exports = { verdict, DEFAULT_TIMEOUT_MS };
