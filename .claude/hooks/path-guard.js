const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`BLOCKED by path-guard hook: ${msg}`);
  process.exit(2);
}

// Convert a feature authorized_paths/forbidden_paths glob into a RegExp and test it
// against an already-repo-relative file path.
// Correctness note (F-0034): `**` is mapped through a sentinel BEFORE single `*` is
// expanded, otherwise the `*`->[^/]* pass corrupts the `.*` produced for `**` into
// `.[^/]*`, which can never cross a `/` — so `src/**` historically failed to match a
// nested file like `src/forge/abSim.ts`. The sentinel keeps `**` = `.*` (crosses dirs).
function matchGlob(filePath, glob) {
  const normPath = normalizePath(filePath);
  const normGlob = glob.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/$/, '').trim();

  if (normGlob === '**') return true;

  const SENT = String.fromCharCode(0); // NUL sentinel — cannot occur in a path or glob
  const regexStr = normGlob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials (NOT * or ?)
    .replace(/\*\*/g, SENT)               // ** -> sentinel (protect from the single-* pass)
    .replace(/\*/g, '[^/]*')              // * -> any run of non-slash chars
    .replace(new RegExp(SENT + '/', 'g'), '(?:.*/)?') // **/ -> optional directory segments
    .replace(new RegExp(SENT, 'g'), '.*') // bare ** -> anything (crosses /)
    .replace(/\?/g, '.');                 // ? -> single char

  return new RegExp('^' + regexStr + '$').test(normPath);
}

// Canonicalize to a repo-relative POSIX path, resolving `..`/`.`/`//` and any
// absolute/drive prefix. path.resolve collapses traversal so `src/../package.json`
// becomes `package.json` (cannot escape an `src/**` scope).
function normalizePath(p) {
  let relative = p;
  try {
    if (path.isAbsolute(p)) {
      relative = path.relative(process.cwd(), p);
    } else {
      relative = path.relative(process.cwd(), path.resolve(p));
    }
  } catch (e) {
    // Fallback if path resolution fails
  }
  return relative.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/$/, '').trim();
}

function run() {
  // Read stdin
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch (e) {
    process.exit(0);
  }

  let filePath = '';
  try {
    const json = JSON.parse(input);
    filePath = json.tool_input?.file_path || '';
  } catch (e) {
    process.exit(0);
  }

  if (!filePath) {
    process.exit(0);
  }

  const normFile = normalizePath(filePath);

  // Locate state file (may be absent or unparseable).
  const featuresPath = process.env.STATE_FILE
    ? path.resolve(process.env.STATE_FILE)
    : path.join(process.cwd(), 'roadmap', 'features.json');

  let featuresData = null;
  let stateReadable = false;
  if (fs.existsSync(featuresPath)) {
    try {
      featuresData = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
      stateReadable = true;
    } catch (e) {
      stateReadable = false;
    }
  }

  // Determine the active feature.
  // Precedence: CLAUDE_ACTIVE_FEATURE env > exactly-one in_progress (mechanical
  // derivation, F-0022) > none. With NO asserted active feature there is no scope to
  // enforce, so editing is permissive (orchestrator/maintenance work).
  let activeFeature = process.env.CLAUDE_ACTIVE_FEATURE || '';
  if (!activeFeature) {
    // Cannot derive without readable state, and nothing is asserted -> permissive.
    if (!stateReadable) {
      process.exit(0);
    }
    const inProgress = (featuresData.features || []).filter(f => f && f.status === 'in_progress');
    if (inProgress.length === 1) {
      activeFeature = inProgress[0].id;
    } else if (inProgress.length > 1) {
      // F-0025: ambiguous — the single-in_progress invariant should prevent this; if a
      // hand-edit produced it, FAIL CLOSED rather than guess.
      fail(`Multiple features are in_progress (${inProgress.map(f => f.id).join(', ')}) — path authorization is ambiguous; refusing the edit (fail-closed). Resolve to a single in_progress feature.`);
    } else {
      process.exit(0); // zero in_progress -> no active feature -> permissive
    }
  }

  // F-0034: an active feature IS asserted (env or derived). From here we FAIL CLOSED on
  // any inability to authorize — missing/unparseable state, unknown id, or duplicate id.
  // (Previously an unknown id exited 0, waving every edit through — the documented bypass.)
  if (!stateReadable) {
    fail(`active feature "${activeFeature}" is asserted but the state file is missing/unparseable at ${featuresPath} (fail-closed).`);
  }
  const matches = (featuresData.features || []).filter(f => f && f.id === activeFeature);
  if (matches.length === 0) {
    fail(`active feature "${activeFeature}" not found in state (fail-closed) — an unknown active-feature id no longer waves edits through.`);
  }
  if (matches.length > 1) {
    fail(`active feature "${activeFeature}" is duplicated in state (fail-closed).`);
  }
  const feature = matches[0];

  const authorized = feature.authorized_paths || [];
  const forbidden = feature.forbidden_paths || [];

  // 1. Forbidden wins (block even if it would otherwise be authorized).
  for (const glob of forbidden) {
    if (matchGlob(normFile, glob)) {
      fail(`File "${filePath}" is in the forbidden_paths list of active feature "${activeFeature}" ("${glob}").`);
    }
  }

  // 2. Must be covered by at least one authorized_paths glob. An active feature with
  //    EMPTY authorized_paths fails closed (matches verify-gate.sh — an in_progress
  //    feature with no declared scope cannot edit anything).
  if (authorized.length === 0) {
    fail(`active feature "${activeFeature}" has empty authorized_paths (fail-closed).`);
  }
  let isAuthorized = false;
  for (const glob of authorized) {
    if (matchGlob(normFile, glob)) {
      isAuthorized = true;
      break;
    }
  }
  if (!isAuthorized) {
    fail(`File "${filePath}" is not in the authorized_paths list of active feature "${activeFeature}".`);
  }

  process.exit(0);
}

run();
