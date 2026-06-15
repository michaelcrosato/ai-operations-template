// scripts/capture.mjs (F-EC1): sandbox-safe evidence capture.
//
// Runs a command via a node child process — NO shell redirection. The sandbox can block
// `cmd > file`, which once forced a builder to HAND-TRANSCRIBE a log (DECISIONS 2026-06-11):
// the exact evidence-integrity failure the gate exists to prevent. This captures the child's
// stdout+stderr programmatically, tees them to roadmap/evidence/<F-XXXX>/<name>.log with a
// provenance header, and propagates the child's real exit code (so a failing command produces
// a failing capture — you cannot launder a red run into a green log).
//
// Usage:  node scripts/capture.mjs <F-XXXX> <name> -- <cmd> [args...]
// Plain ESM (no ts-node) for minimum-dependency robustness. EVIDENCE_ROOT overrides the
// output root (a test seam, like STATE_FILE for update-state — it forges nothing CI re-runs).

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 2) {
  console.error('usage: node scripts/capture.mjs <F-XXXX> <name> -- <cmd> [args...]');
  process.exit(2);
}
const feature = argv[0];
const name = argv[1];
const cmd = argv.slice(sep + 1);

if (!/^F-\d{4}$/.test(feature)) { console.error(`capture: feature must be F-XXXX, got "${feature}"`); process.exit(2); }
if (!name || /[\\/]/.test(name) || name.includes('..')) { console.error(`capture: name must be a bare filename, got "${name}"`); process.exit(2); }
if (cmd.length === 0) { console.error('capture: no command after "--"'); process.exit(2); }

const evidenceRoot = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.join(process.cwd(), 'roadmap', 'evidence');
const dir = path.join(evidenceRoot, feature);
fs.mkdirSync(dir, { recursive: true });
const logPath = path.join(dir, name.endsWith('.log') ? name : `${name}.log`);

let commit = 'unknown';
try { commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'unknown'; } catch { /* not a git tree */ }
const ts = new Date().toISOString();

// shell:false => the command runs directly, no shell, no redirection metacharacters.
const res = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024 });

let exit;
if (res.error) exit = 127;             // spawn failed (e.g. command not found)
else if (res.status === null) exit = 1; // terminated by signal
else exit = res.status;

const stdout = res.stdout ?? '';
const stderr = res.stderr ?? '';
// Defense-in-depth (F-EC1 review): a FAILING capture must not leave a clean
// "VERIFY: PASS (exit 0)" line that the evidence gate could misread as green. Annotate any
// such echoed line so the gate's exact-line match fails; CAPTURE-EXIT stays authoritative.
const neutralize = (text) => exit === 0 ? text
  : text.split(/\r?\n/).map((l) => (l.trim() === 'VERIFY: PASS (exit 0)'
      ? `${l}  [NEUTRALIZED: captured command exited ${exit}]` : l)).join('\n');
const header =
  'CAPTURED-BY: scripts/capture.mjs\n' +
  `CAPTURE-FEATURE: ${feature}\n` +
  `CAPTURE-CMD: ${cmd.join(' ')}\n` +
  `CAPTURE-COMMIT: ${commit}\n` +
  `CAPTURE-TS: ${ts}\n` +
  `CAPTURE-EXIT: ${exit}\n` +
  (res.error ? `CAPTURE-SPAWN-ERROR: ${res.error.message}\n` : '') +
  '----- 8< ----- captured stdout+stderr below -----\n';
fs.writeFileSync(logPath, header + neutralize(stdout) + (stderr ? `\n----- stderr -----\n${neutralize(stderr)}\n` : ''), 'utf8');

process.stderr.write(`[capture] wrote ${logPath} (exit ${exit})\n`);
process.exit(exit);
