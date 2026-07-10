import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * check-model-policy.ts — makes `.claude/model-policy.json` the REAL single source of
 * truth for sub-agent model assignment (AI_OPERATIONS_PLAN §2.2).
 *
 * The policy maps each agent (`agents`: agent-name → capability tier) and each tier to a
 * model (`tiers`: tier → {model,...}). A sub-agent's frontmatter `model:` is DERIVED from
 * the policy, never hand-set — this script is the "hygiene routine" §2.2 promises:
 *   --check  (default; wired into verify.sh) → exit 1 if any agent frontmatter `model:` drifts
 *   --write  → rewrite each agent's frontmatter `model:` to the policy value, in place
 *
 * Fail-closed: an agent .md that declares a `model:` but is absent from `agents` is an error
 * (no unmanaged/hardcoded model names can slip in). MODEL_POLICY_ROOT overrides the `.claude`
 * root so contract tests can run against a fixture without touching the real config.
 */

const ROOT = process.env.MODEL_POLICY_ROOT
  ? path.resolve(process.env.MODEL_POLICY_ROOT)
  : path.join(process.cwd(), '.claude');
const POLICY_FILE = path.join(ROOT, 'model-policy.json');
const AGENTS_DIR = path.join(ROOT, 'agents');

interface Policy {
  tiers: Record<string, { model?: unknown }>;
  agents: Record<string, unknown>;
}

// Agent names become path segments (`<name>.md`) in --write. Constrain them to a safe
// shape so a hand-edited/compromised policy can never traverse out of the agents dir.
const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/;

function fail(msg: string): never {
  console.error(`[check-model-policy] ${msg}`);
  process.exit(1);
}

function loadPolicy(): Policy {
  if (!fs.existsSync(POLICY_FILE)) fail(`policy not found: ${POLICY_FILE}`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
  } catch (e) {
    fail(`policy is not valid JSON: ${(e as Error).message}`);
  }
  const p = raw as { tiers?: unknown; agents?: unknown };
  if (!p.tiers || typeof p.tiers !== 'object') fail('policy.tiers missing or not an object');
  if (!p.agents || typeof p.agents !== 'object') {
    fail('policy.agents missing or not an object — add an {agent: tier} map (the machine-readable §2.2 binding)');
  }
  return {
    tiers: p.tiers as Record<string, { model?: unknown }>,
    agents: p.agents as Record<string, unknown>,
  };
}

// Resolve the policy-mandated model for an agent name; fail closed on any malformed mapping.
function policyModelFor(policy: Policy, agent: string): string {
  const tier = policy.agents[agent];
  if (typeof tier !== 'string') fail(`agents["${agent}"] must name a tier (string)`);
  const t = policy.tiers[tier];
  if (!t || typeof t !== 'object') fail(`agent "${agent}" maps to unknown tier "${tier}"`);
  const model = (t as { model?: unknown }).model;
  if (typeof model !== 'string' || model.length === 0) fail(`tier "${tier}" has no string model`);
  return model;
}

// Parse the `model:` line out of a YAML frontmatter block (between the first two `---` lines).
function readFrontmatterModel(file: string): { model: string; lineIdx: number; lines: string[] } | null {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return null; // unterminated frontmatter
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^model:\s*(\S+)\s*$/);
    if (m) return { model: m[1], lineIdx: i, lines };
  }
  return null; // frontmatter present but no model line
}

function main(): void {
  const write = process.argv.includes('--write');
  const policy = loadPolicy();
  const agentNames = Object.keys(policy.agents);

  // Validate every mapped name BEFORE it is used to build a file path (--write writes
  // `<name>.md`). Fail closed on anything that could escape the agents dir.
  for (const name of agentNames) {
    if (!SAFE_NAME.test(name)) fail(`policy.agents key "${name}" is not a safe agent name ([a-z0-9-])`);
  }

  // Fail-closed: any agent .md that sets a `model:` must be governed by the policy map,
  // so a new agent cannot silently hardcode an unmanaged model name (§2.2).
  if (fs.existsSync(AGENTS_DIR)) {
    for (const f of fs.readdirSync(AGENTS_DIR)) {
      if (!f.endsWith('.md')) continue;
      const name = f.slice(0, -3);
      if (name in policy.agents) continue;
      const fm = readFrontmatterModel(path.join(AGENTS_DIR, f));
      if (fm) {
        fail(`agent "${name}" sets model: ${fm.model} but is not in policy.agents — add it to model-policy.json (no unmanaged model names, §2.2)`);
      }
    }
  }

  const drifts: string[] = [];
  for (const name of agentNames) {
    const want = policyModelFor(policy, name);
    const file = path.join(AGENTS_DIR, `${name}.md`);
    if (!fs.existsSync(file)) fail(`policy.agents lists "${name}" but ${file} does not exist`);
    const fm = readFrontmatterModel(file);
    if (!fm) fail(`${file} has no frontmatter "model:" line to govern`);
    if (fm.model === want) continue;
    if (write) {
      fm.lines[fm.lineIdx] = `model: ${want}`;
      fs.writeFileSync(file, fm.lines.join('\n'));
      console.log(`[check-model-policy] synced ${name}: ${fm.model} -> ${want}`);
    } else {
      drifts.push(`  ${name}: frontmatter=${fm.model}  policy=${want}`);
    }
  }

  if (!write && drifts.length > 0) {
    console.error('[check-model-policy] FAIL: agent frontmatter `model:` drifted from .claude/model-policy.json');
    console.error('Run `npx ts-node scripts/check-model-policy.ts --write` (or the /research hygiene routine) to resync:');
    console.error(drifts.join('\n'));
    process.exit(1);
  }
  console.log(`[check-model-policy] OK: ${agentNames.length} agent model bindings ${write ? 'synced to' : 'match'} policy`);
}

main();
