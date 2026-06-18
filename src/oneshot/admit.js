'use strict';

/**
 * Admission gate for the one-shot tool (F-0040).
 *
 * ## Task-descriptor shape (consumed here; reused by F-0041)
 *
 * @typedef {Object} TaskDescriptor
 * @property {string}   acceptanceCommand
 *   A single, machine-runnable shell command that verifies task completion.
 *   Must be exactly one command — no newlines, no shell-chaining operators
 *   (`;`, `&&`, `||`) and no pipes (`|`).
 * @property {string[]} contextPaths
 *   Relative (or absolute) file paths whose contents form the working-context
 *   for the task. Token estimates are computed over the concatenated contents.
 *
 * @typedef {Object} AdmitOptions
 * @property {number} [budget]
 *   Working-set token budget. Resolved in order:
 *     1. options.budget
 *     2. process.env.ONESHOT_TOKEN_BUDGET (parseInt)
 *     3. DEFAULT_TOKEN_BUDGET constant
 */

/**
 * Default working-set token budget.
 * Reflects that the *reliable* working set is a fraction of the model's full
 * context window (docs/bounded-vs-afk-strategy.md section 2.2). A task whose
 * context exceeds this limit is likely to produce unreliable outputs and should
 * be split or scoped down before admission.
 */
const DEFAULT_TOKEN_BUDGET = 8000;

/**
 * Token heuristic: 1 token ≈ 4 characters (tiktoken GPT-3.5/4 rule of thumb).
 * Deterministic, local, zero-dependency. Applied over the raw UTF-8 character
 * count of each file's content. An unreadable path contributes 0 characters.
 *
 * @param {number} totalChars
 * @returns {number}
 */
function charsToTokens(totalChars) {
  return Math.ceil(totalChars / 4);
}

/**
 * Shell-chaining operators / pipe pattern.
 * Rejects any acceptanceCommand that contains:
 *   - a newline  (\n)
 *   - semicolons (;)
 *   - logical AND (&&) or OR (||)
 *   - a bare pipe (|)
 */
const CHAINING_RE = /[\n;]|&&|\|\||\|/;

/**
 * Resolve the working-set token budget from options -> env -> default.
 *
 * @param {AdmitOptions} [options]
 * @returns {number}
 */
function resolveBudget(options) {
  if (options && typeof options.budget === 'number') return options.budget;
  const envVal = parseInt(process.env.ONESHOT_TOKEN_BUDGET ?? '', 10);
  if (!Number.isNaN(envVal)) return envVal;
  return DEFAULT_TOKEN_BUDGET;
}

const fs = require('node:fs');

/**
 * Evaluate whether a task descriptor may be admitted to the one-shot harness.
 *
 * @param {TaskDescriptor} descriptor
 * @param {AdmitOptions}   [options]
 * @returns {{ verdict: 'ADMIT' }
 *          | { verdict: 'REJECT', reason: 'no-verifiable-criterion' }
 *          | { verdict: 'REJECT', reason: 'over-budget', tokens: { measured: number, budget: number } }}
 */
function admit(descriptor, options) {
  const { acceptanceCommand, contextPaths = [] } = descriptor ?? {};

  // -- Gate 1: acceptance command must be a single, non-empty shell command --
  const cmd = typeof acceptanceCommand === 'string' ? acceptanceCommand.trim() : '';
  if (!cmd || CHAINING_RE.test(acceptanceCommand)) {
    return { verdict: 'REJECT', reason: 'no-verifiable-criterion' };
  }

  // -- Gate 2: assembled context must fit within the working-set budget --
  const budget = resolveBudget(options);

  let totalChars = 0;
  for (const p of contextPaths) {
    try {
      // Read as UTF-8; .length is character count -- good enough for the heuristic.
      totalChars += fs.readFileSync(p, 'utf8').length;
    } catch {
      // Unreadable path -> 0 chars (deterministic, documented in spec).
    }
  }

  const measured = charsToTokens(totalChars);
  if (measured > budget) {
    return { verdict: 'REJECT', reason: 'over-budget', tokens: { measured, budget } };
  }

  return { verdict: 'ADMIT' };
}

module.exports = { admit, DEFAULT_TOKEN_BUDGET };

// -- CLI shim (mirrors src/health.js) ----------------------------------------
if (require.main === module) {
  const descriptorPath = process.argv[2];
  if (!descriptorPath) {
    process.stderr.write('usage: node src/oneshot/admit.js <descriptor.json>\n');
    process.exit(2);
  }
  let descriptor;
  try {
    descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`admit: cannot read descriptor: ${err.message}\n`);
    process.exit(2);
  }
  const result = admit(descriptor);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.verdict === 'ADMIT' ? 0 : 1);
}
