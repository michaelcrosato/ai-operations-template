import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * update-state.ts — the ONLY writer for roadmap/features.json (plan §4.2).
 * A PreToolUse hook blocks direct edits; CI re-validates on every PR.
 *
 * Usage:
 *   ts-node scripts/update-state.ts --validate
 *   ts-node scripts/update-state.ts --add '<feature-json>'
 *   ts-node scripts/update-state.ts --status F-0001 in_progress|pending|blocked|done|awaiting_approval [reason]
 *   ts-node scripts/update-state.ts --attempt F-0001
 *   ts-node scripts/update-state.ts --evidence F-0001 <path> [<path>...]
 *   ts-node scripts/update-state.ts --passes F-0001 true
 *   ts-node scripts/update-state.ts --paths F-0001 '<json-string-array>'   (replace authorized_paths — groom corrections)
 */

// STATE_FILE override exists for contract tests (scripts/test-hooks.sh) so they
// can exercise mutations against a fixture without touching the real backlog.
const FILE = process.env.STATE_FILE
  ? path.resolve(process.env.STATE_FILE)
  : path.join(process.cwd(), 'roadmap', 'features.json');
// 'awaiting_approval' (F-AP1): a feature that is built + verified + reviewed but whose
// irreversible/operator-visible MERGE is held for human sign-off (Tier C / REQUIRE_APPROVAL,
// TASK_AUTONOMY_TRIAGE §3). It is PARKED — it does not occupy the single in_progress slot, so
// the loop keeps moving on other features (the gate never blocks the loop).
const STATUSES = ['pending', 'in_progress', 'blocked', 'done', 'awaiting_approval'];
const REQUIRED = [
  'id', 'epic', 'title', 'spec_ref', 'description', 'acceptance',
  'authorized_paths', 'forbidden_paths', 'priority', 'status', 'passes',
  'evidence', 'attempts', 'blocked_reason'
];
// Closed-shape allow-list (F-SM2): the only keys a feature row may carry. Adding a new
// field (e.g. a future `tier`) is a deliberate act — extend this AND features.schema.json
// together; a cross-check contract test (test-hooks.sh) keeps the two in lockstep so the
// schema is no longer decorative. An unknown key (typo or injection) is rejected by validate().
const KNOWN_KEYS = new Set([...REQUIRED, 'dependencies', 'tier']);
// Task-autonomy tier (TASK_AUTONOMY_TRIAGE.md): A=delegable / B=supervised / C=human-directed.
// Optional (groom assigns it; legacy rows omit it); when present it must be one of these. The
// /work loop switches review depth by tier (A=spot-check, B=mandatory evaluator, C=+security
// reviewer +human-approval gate) — the loop-switching the operator asked for.
const TIERS = ['A', 'B', 'C'];
// The build agents a metrics record may name (cost dimension). Keep in sync with the
// builder entries in .claude/model-policy.json `agents`. Used to validate metrics.jsonl.
const BUILDERS = ['builder', 'builder-strong'];
// forbidden_paths defaults that --add must never let a caller clear (guardrail surfaces).
const SAFETY_FORBIDDEN = ['.claude/**', '.github/workflows/**'];

interface Feature {
  id: string; epic: string; title: string; spec_ref: string; description: string;
  acceptance: string[]; authorized_paths: string[]; forbidden_paths: string[];
  dependencies?: string[]; tier?: string; priority: number; status: string; passes: boolean;
  evidence: string[]; attempts: number; blocked_reason: string | null;
}

function fail(msg: string): never {
  console.error(`[update-state] ERROR: ${msg}`);
  process.exit(1);
}

function load(): { $schema?: string; features: Feature[] } {
  if (!fs.existsSync(FILE)) fail(`${FILE} not found`);
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    fail(`features file is not valid JSON: ${e}`);
  }
}

function save(data: { features: Feature[] }): void {
  const errors = validate(data.features);
  if (errors.length) fail(`refusing to save invalid state:\n  - ${errors.join('\n  - ')}`);
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, FILE);
  console.log('[update-state] saved.');
}

function validate(features: Feature[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const f of features) {
    const rec = f as unknown as Record<string, unknown>;
    if (typeof f !== 'object' || f === null) { errors.push('a feature entry is not an object'); continue; }
    const idLabel = typeof rec.id === 'string' ? rec.id : '?';
    // Required-key presence.
    for (const key of REQUIRED) {
      if (!(key in rec)) errors.push(`${idLabel}: missing field "${key}"`);
    }
    // Closed shape (F-SM2): reject any field outside KNOWN_KEYS so a typo (e.g. "passe")
    // or an injected key cannot silently survive and corrupt a later reader's decision.
    for (const key of Object.keys(rec)) {
      if (!KNOWN_KEYS.has(key)) errors.push(`${idLabel}: unknown field "${key}" — add it to features.schema.json + KNOWN_KEYS deliberately`);
    }
    // Per-field type guards (F-SM2): reject malformed-but-present fields the presence check
    // alone passes, and prevent type-confusion crashes in the value checks below.
    if (typeof rec.id !== 'string') errors.push('feature id must be a string');
    for (const k of ['epic', 'title', 'spec_ref', 'description', 'status'] as const) {
      if (typeof rec[k] !== 'string') errors.push(`${idLabel}: "${k}" must be a string`);
    }
    if (typeof rec.passes !== 'boolean') errors.push(`${idLabel}: "passes" must be a boolean`);
    if (!(typeof rec.blocked_reason === 'string' || rec.blocked_reason === null)) errors.push(`${idLabel}: "blocked_reason" must be a string or null`);
    for (const k of ['acceptance', 'authorized_paths', 'forbidden_paths', 'evidence'] as const) {
      if (!Array.isArray(rec[k]) || (rec[k] as unknown[]).some((x) => typeof x !== 'string')) errors.push(`${idLabel}: "${k}" must be an array of strings`);
    }
    if (rec.dependencies !== undefined && (!Array.isArray(rec.dependencies) || (rec.dependencies as unknown[]).some((x) => typeof x !== 'string'))) {
      errors.push(`${idLabel}: "dependencies" must be an array of strings`);
    }
    if (!Number.isInteger(rec.attempts)) errors.push(`${idLabel}: "attempts" must be an integer`);
    if (!Number.isInteger(rec.priority)) errors.push(`${idLabel}: "priority" must be an integer`);
    if (rec.tier !== undefined && !(typeof rec.tier === 'string' && TIERS.includes(rec.tier))) {
      errors.push(`${idLabel}: "tier" must be one of ${TIERS.join('/')} when present`);
    }
    // If a field the value checks below rely on has the wrong type, skip them for this
    // feature so a malformed hand-edit reports cleanly instead of throwing on CI.
    if (typeof rec.id !== 'string' || typeof rec.status !== 'string' || !Array.isArray(rec.evidence)
      || !Array.isArray(rec.acceptance) || !Number.isInteger(rec.attempts) || !Number.isInteger(rec.priority)) {
      continue;
    }
    if (!/^F-\d{4}$/.test(f.id)) errors.push(`invalid id "${f.id}" (want F-XXXX)`);
    if (ids.has(f.id)) errors.push(`duplicate id ${f.id}`);
    ids.add(f.id);
    if (!STATUSES.includes(f.status)) errors.push(`${f.id}: invalid status "${f.status}"`);
    if (!Number.isInteger(f.priority) || f.priority < 1 || f.priority > 3) errors.push(`${f.id}: priority must be 1..3`);
    if (!Array.isArray(f.acceptance) || f.acceptance.length === 0) errors.push(`${f.id}: needs at least one acceptance criterion`);
    if (f.attempts < 0) errors.push(`${f.id}: attempts < 0`);
    if (f.status === 'blocked' && !f.blocked_reason) errors.push(`${f.id}: blocked without blocked_reason`);
    if (f.passes && f.evidence.length === 0) errors.push(`${f.id}: passes:true with no evidence (default-FAIL contract)`);
    if (f.status === 'done' && !f.passes) errors.push(`${f.id}: status:done requires passes:true (evidence-gated flow)`);
    // F-AP1: a feature can only await approval AFTER it was built + verified — never a way to
    // park an unbuilt feature in a human-gated limbo. The merge/passes still happens on approval.
    if (f.status === 'awaiting_approval' && f.evidence.length === 0) errors.push(`${f.id}: status:awaiting_approval requires evidence (built + verified, pending operator sign-off)`);
  }
  // F-0025: single-in_progress invariant. The path-authorization guard (F-0007/F-0022)
  // derives the active feature from the lone in_progress row; 2+ in_progress makes that
  // ambiguous and (pre-F-0025) flipped the guard to permissive — a self-bypass. Reject it.
  {
    const wip = features.filter((f) => f.status === 'in_progress');
    if (wip.length > 1) {
      errors.push(`only one feature may be in_progress at a time (found ${wip.length}: ${wip.map((f) => f.id).join(', ')}) — the path guard derives scope from the single in_progress row`);
    }
  }
  for (const f of features) {
    for (const dep of (Array.isArray(f.dependencies) ? f.dependencies : [])) {
      if (!ids.has(dep)) errors.push(`${f.id}: dependency ${dep} does not exist`);
      if (dep === f.id) errors.push(`${f.id}: depends on itself`);
    }
  }
  // Dependency cycle detection (DFS with three colors)
  const deps = new Map(features.map((f) => [f.id, Array.isArray(f.dependencies) ? f.dependencies : []]));
  const state = new Map<string, 'visiting' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`dependency cycle: ${[...trail, id].join(' -> ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const d of deps.get(id) ?? []) if (deps.has(d)) walk(d, [...trail, id]);
    state.set(id, 'done');
  };
  for (const f of features) walk(f.id, []);
  return errors;
}

function find(data: { features: Feature[] }, id: string): Feature {
  const f = data.features.find((x) => x.id === id);
  if (!f) fail(`feature ${id} not found`);
  return f;
}

/** Evidence contract: every evidence file exists, is non-empty, and at least
 *  one is a verify log proving a green gate run (plan §4.2, §6.3). Used by
 *  --passes at flip time AND by --validate for every passing feature, so a
 *  hand-edited or bash-redirected passes:true cannot survive CI. */
function collectEvidenceErrors(f: Feature): string[] {
  const errors: string[] = [];
  if (f.evidence.length === 0) return [`${f.id}: no evidence recorded; run --evidence first`];
  let hasGreenVerifyLog = false;
  for (const rel of f.evidence) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) {
      errors.push(`${f.id}: evidence file missing on disk: ${rel}`);
      continue;
    }
    const stat = fs.statSync(p);
    if (stat.isFile() && stat.size === 0) errors.push(`${f.id}: evidence file is empty: ${rel}`);
    if (/verify.*\.log$/i.test(rel)) {
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      // Exact-line match, not substring: a failed run's log QUOTES the marker
      // inside this very audit's error message, which once self-satisfied the
      // check (found via PR #14). A quoted occurrence is never a whole line.
      const hasMarker = lines.some((l) => l.trim() === 'VERIFY: PASS (exit 0)');
      // F-EC1 (security review): if this log was produced by scripts/capture.mjs, the
      // captured command's REAL exit code is authoritative — a PASS marker merely echoed
      // by a FAILING command must NOT count as green. The CAPTURE-EXIT header is the truth.
      const fromCapture = lines.some((l) => l.trim() === 'CAPTURED-BY: scripts/capture.mjs');
      const captureGreen = lines.some((l) => l.trim() === 'CAPTURE-EXIT: 0');
      if (hasMarker && (!fromCapture || captureGreen)) hasGreenVerifyLog = true;
    }
  }
  if (!hasGreenVerifyLog) {
    errors.push(`${f.id}: no green verify log among evidence (need a *verify*.log containing "VERIFY: PASS (exit 0)" from scripts/verify.sh)`);
  }
  return errors;
}

const [, , cmd, ...args] = process.argv;
const data = load();

switch (cmd) {
  case '--validate': {
    const errors = validate(data.features);
    // Deep evidence audit: re-verify the physical evidence contract for every
    // feature claiming passes:true, not just at flip time.
    for (const f of data.features.filter((x) => x.passes)) {
      errors.push(...collectEvidenceErrors(f));
    }
    // Model-policy freshness (F-0009): warn — never fail — when a tier's
    // last_verified exceeds 30 days, so the next session's /research runs.
    // A scheduled auto-PR cron was deliberately rejected (DECISIONS 2026-06-10).
    const policyFile = process.env.MODEL_POLICY_FILE
      ? path.resolve(process.env.MODEL_POLICY_FILE)
      : path.join(process.cwd(), '.claude', 'model-policy.json');
    if (fs.existsSync(policyFile)) {
      try {
        const policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
        const now = Date.now();
        for (const [tier, cfg] of Object.entries(policy.tiers ?? {})) {
          const stamp = (cfg as { last_verified?: string }).last_verified;
          const parsed = stamp ? Date.parse(stamp) : Number.NaN;
          if (Number.isNaN(parsed) || now - parsed > 30 * 24 * 3600 * 1000) {
            console.warn(`[update-state] WARN: model-policy tier "${tier}" last_verified is stale (>30d or missing) — run /research to re-verify the mapping.`);
          }
        }
      } catch {
        console.warn('[update-state] WARN: model-policy.json unreadable — run /research.');
      }
    }
    // Session metrics integrity (F-0010): roadmap/metrics.jsonl is consumed by
    // /kaizen and /status — a malformed record fails validation.
    const metricsFile = process.env.METRICS_FILE
      ? path.resolve(process.env.METRICS_FILE)
      : path.join(process.cwd(), 'roadmap', 'metrics.jsonl');
    if (fs.existsSync(metricsFile)) {
      const recordLines = fs.readFileSync(metricsFile, 'utf8').split(/\r?\n/).filter((l) => l.trim());
      recordLines.forEach((l, idx) => {
        // Bounded-injection rule (plan §9): metrics feed /kaizen and /status
        // context, so an oversized record is a prompt-injection channel.
        if (l.length > 500) {
          errors.push(`metrics.jsonl line ${idx + 1}: record exceeds 500 chars (bounded-injection rule)`);
          return;
        }
        try {
          const rec = JSON.parse(l);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date ?? '')) errors.push(`metrics.jsonl line ${idx + 1}: missing/invalid "date" (YYYY-MM-DD)`);
          if (typeof rec.feature !== 'string' || !rec.feature) errors.push(`metrics.jsonl line ${idx + 1}: missing "feature"`);
          // Cost/quality fields (F-CG1) are OPTIONAL (legacy records predate them) but must be
          // well-formed WHEN PRESENT, so /kaizen's cost scan reads trustworthy data, not free-text.
          if (rec.tier !== undefined && !(typeof rec.tier === 'string' && TIERS.includes(rec.tier))) errors.push(`metrics.jsonl line ${idx + 1}: "tier" must be one of ${TIERS.join('/')} when present`);
          if (rec.builder !== undefined && !(typeof rec.builder === 'string' && BUILDERS.includes(rec.builder))) errors.push(`metrics.jsonl line ${idx + 1}: "builder" must be one of ${BUILDERS.join('/')} when present`);
          if (rec.attempts !== undefined && !Number.isInteger(rec.attempts)) errors.push(`metrics.jsonl line ${idx + 1}: "attempts" must be an integer when present`);
        } catch {
          errors.push(`metrics.jsonl line ${idx + 1}: not valid JSON`);
        }
      });
    }
    if (errors.length) fail(`invalid backlog:\n  - ${errors.join('\n  - ')}`);
    console.log(`[update-state] valid: ${data.features.length} features, ` +
      `${data.features.filter((f) => f.passes).length} passing (evidence re-verified).`);
    break;
  }
  case '--add': {
    if (!args[0]) fail('--add requires a JSON argument');
    let incoming: Partial<Feature>;
    try { incoming = JSON.parse(args[0]); } catch (e) { fail(`--add argument is not valid JSON: ${e}`); }
    const feature: Feature = {
      dependencies: [], status: 'pending', passes: false, evidence: [],
      attempts: 0, blocked_reason: null,
      ...incoming,
      // F-SM2: the guardrail-surface forbidden_paths can NEVER be cleared by caller input.
      // Placed AFTER ...incoming and unioned, so a caller-supplied forbidden_paths can only
      // ADD entries, never drop .claude/** or .github/workflows/**.
      forbidden_paths: Array.from(new Set([...SAFETY_FORBIDDEN, ...(Array.isArray(incoming.forbidden_paths) ? incoming.forbidden_paths : [])])),
    } as Feature;
    // Reserved fixture range (kaizen 2026-06-11): contract tests use F-9xxx ids,
    // so a writer call that escapes its STATE_FILE fixture fails loudly here
    // instead of silently planting fixture rows in the real backlog (incident
    // found on PR #24: fixture mutations leaked into the live features.json).
    if (!process.env.STATE_FILE && /^F-9\d{3}$/.test(feature.id ?? '')) {
      fail(`${feature.id} is in the reserved contract-test fixture range (F-9xxx); it cannot be added to the real backlog`);
    }
    if (feature.passes) fail('new features are born failing (default-FAIL contract); cannot --add with passes:true');
    // F-AP1 (security review): a feature must be BORN `pending` — the lifecycle (in_progress →
    // built+verified → awaiting_approval / done) runs only through --status, which enforces the
    // transition guards. Without this, `...incoming` could override the pending default to birth a
    // feature directly in in_progress/blocked/done/awaiting_approval, skipping every build gate.
    if (feature.status !== 'pending') fail(`new features are born status:pending (the lifecycle runs via --status); cannot --add with status:"${feature.status}"`);
    data.features.push(feature);
    save(data);
    break;
  }
  case '--status': {
    const [id, status, ...reason] = args;
    if (!id || !status) fail('--status requires <id> <status>');
    const f = find(data, id);
    // F-0025: single-in_progress invariant — refuse to open a 2nd concurrent
    // in_progress feature, which would make the path guard go permissive (self-bypass).
    if (status === 'in_progress') {
      const other = data.features.find((x) => x.id !== id && x.status === 'in_progress');
      if (other) {
        fail(`cannot set ${id} in_progress: ${other.id} is already in_progress (single-in_progress invariant — finish, block, or revert it first)`);
      }
    }
    // F-AP1: the only forward path into the human-approval hold is from an in_progress feature
    // that already has build evidence. This keeps awaiting_approval a real post-build gate (not a
    // way to skip the build) while leaving it OUT of the single-in_progress slot (loop keeps moving).
    if (status === 'awaiting_approval') {
      if (f.status !== 'in_progress') fail(`cannot set ${id} awaiting_approval: only an in_progress feature can be parked for sign-off (current: ${f.status})`);
      if (f.evidence.length === 0) fail(`cannot set ${id} awaiting_approval: no evidence — build + verify before requesting operator sign-off`);
    }
    f.status = status;
    f.blocked_reason = status === 'blocked' ? (reason.join(' ') || 'unspecified') : null;
    save(data);
    break;
  }
  case '--attempt': {
    const f = find(data, args[0]);
    f.attempts += 1;
    console.log(`[update-state] ${f.id} attempts = ${f.attempts}${f.attempts >= 2 ? ' (two-strike limit reached — block and move on)' : ''}`);
    save(data);
    break;
  }
  case '--evidence': {
    const [id, ...paths] = args;
    if (!id || paths.length === 0) fail('--evidence requires <id> <path> [...]');
    const f = find(data, id);
    for (const p of paths) {
      if (!fs.existsSync(path.join(process.cwd(), p))) fail(`evidence file does not exist: ${p}`);
      if (!f.evidence.includes(p)) f.evidence.push(p);
    }
    save(data);
    break;
  }
  case '--paths': {
    const [id, json] = args;
    if (!id || !json) fail('--paths requires <id> <json-string-array>');
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch (e) { fail(`--paths argument is not valid JSON: ${e}`); }
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((p) => typeof p === 'string' && p.length > 0)) {
      fail('--paths requires a non-empty JSON array of glob strings');
    }
    const paths = parsed as string[];
    // Scope-rewrite hardening (security review, PR #16): rescoping must never
    // be able to grant a feature the guardrail surfaces, no matter what the
    // current scope says. Guardrail edits are factory work with their own PRs.
    const GUARD_SURFACES = /^(\.claude|\.github|scripts)(\/|$)/;
    const BROAD = new Set(['*', '**', '**/*', '**/**', './**', '/**']);
    for (const p of paths) {
      if (p.includes('..')) fail(`--paths rejects parent-traversal glob: "${p}"`);
      if (BROAD.has(p.trim())) fail(`--paths rejects catch-all glob "${p}" — scope must be explicit`);
      if (GUARD_SURFACES.test(p.trim())) fail(`--paths rejects guardrail surface "${p}" (.claude/, .github/, scripts/ are never feature scope)`);
    }
    const f = find(data, id);
    if (f.status !== 'pending' && f.status !== 'in_progress') fail(`${f.id}: can only rescope pending/in_progress features (status: ${f.status})`);
    for (const p of paths) {
      if ((f.forbidden_paths ?? []).some((fp) => fp === p || (fp.endsWith('/**') && p.startsWith(fp.slice(0, -2))))) {
        fail(`${f.id}: "${p}" collides with the feature's own forbidden_paths`);
      }
    }
    f.authorized_paths = paths;
    save(data);
    break;
  }
  case '--passes': {
    const [id, value] = args;
    if (value !== 'true') fail('--passes only accepts "true" (features are born failing; to un-pass, fix the feature)');
    const f = find(data, id);
    const evidenceErrors = collectEvidenceErrors(f);
    if (evidenceErrors.length) fail(evidenceErrors.join('\n  - '));
    f.passes = true;
    save(data);
    break;
  }
  default:
    fail(`unknown command "${cmd ?? ''}". See header comment for usage.`);
}
