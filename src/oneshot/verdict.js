'use strict';

/**
 * Evidence-gated verdict for the one-shot tool (F-0041).
 *
 * After a bounded attempt on an admitted task, the verdict RUNS the task's
 * acceptance command, captures the REAL exit code to an evidence file, and
 * returns PASS only when that captured exit code is 0.
 *
 * ## API
 *
 * @typedef {import('./admit.js').TaskDescriptor} TaskDescriptor
 *
 * @typedef {Object} VerdictOptions
 * @property {string} [evidencePath]
 *   Absolute or relative path for the evidence JSON file.
 *   Defaults to a timestamped file in the OS temp directory.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Default evidence path: OS temp dir, timestamped to avoid collisions.
 * @returns {string}
 */
function defaultEvidencePath() {
  return path.join(os.tmpdir(), `oneshot-verdict-${Date.now()}.json`);
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
 * @returns {{ verdict: 'PASS' }
 *          | { verdict: 'NOT-DONE', report: { claimed: string, evidence: { exitCode: number, command: string } } }}
 */
function verdict(descriptor, options) {
  const command = descriptor.acceptanceCommand;
  const evidencePath = options?.evidencePath ? options.evidencePath : defaultEvidencePath();

  // Run the acceptance command as a shell command; shell:true lets it work
  // exactly as the user would type it (and mirrors how capture.mjs runs gates).
  const res = spawnSync(command, [], {
    shell: true,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });

  // Treat spawn error or signal-termination as non-zero (not done).
  let exitCode;
  if (res.error) {
    exitCode = 127;
  } else if (res.status === null) {
    exitCode = 1;
  } else {
    exitCode = res.status;
  }

  // Write the evidence record unconditionally — the captured exit code is
  // the authoritative truth; the file persists regardless of pass/fail.
  const evidence = {
    command,
    exitCode,
    timestamp: new Date().toISOString(),
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? ''
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');

  if (exitCode === 0) {
    return { verdict: 'PASS' };
  }

  const claimed = (descriptor.claimed !== undefined ? String(descriptor.claimed) : 'unknown');
  return {
    verdict: 'NOT-DONE',
    report: {
      claimed,
      evidence: { exitCode, command }
    }
  };
}

module.exports = { verdict };
