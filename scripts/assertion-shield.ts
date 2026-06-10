import { execSync } from 'child_process';

/**
 * Assertion Shield:
 * Scans git diffs to detect and block the removal or weakening
 * of test assertions by AI agents.
 */

const BASE_BRANCH = process.env.BASE_BRANCH || 'origin/develop';

function getGitDiff(): string {
  try {
    // Attempt diff against base branch first
    return execSync(`git diff ${BASE_BRANCH}...HEAD`, { encoding: 'utf8' });
  } catch {
    try {
      // Fallback: Diff last commit if base branch is not fetched or available
      return execSync('git diff HEAD~1', { encoding: 'utf8' });
    } catch {
      console.log('No git history found or not in git repository. Skipping assertion check.');
      return '';
    }
  }
}

interface Violation {
  file: string;
  line: string;
  lineNum?: number;
}

function scanDiffForWeakening(diffText: string): Violation[] {
  const violations: Violation[] = [];
  const lines = diffText.split('\n');
  let currentFile = '';

  const testFileRegex = /\.(test|spec)\.(ts|js|py|rs|go|cpp|java)$|__tests__/;
  const assertionKeywords = [
    'expect(',
    'assert.',
    'assert_eq!',
    'self.assert',
    'assert ',
    'it(',
    'test(',
    'describe('
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('+++ b/')) {
      currentFile = line.substring(6);
      continue;
    }

    // Check if we are parsing a test file
    if (currentFile && testFileRegex.test(currentFile)) {
      // Check if line was deleted (starts with "-" but not "---")
      if (line.startsWith('-') && !line.startsWith('---')) {
        const cleanedLine = line.substring(1).trim();
        
        // Skip comment-only lines
        if (cleanedLine.startsWith('//') || cleanedLine.startsWith('#') || cleanedLine.startsWith('/*')) {
          continue;
        }

        const containsAssertion = assertionKeywords.some(keyword => cleanedLine.includes(keyword));
        if (containsAssertion) {
          violations.push({
            file: currentFile,
            line: cleanedLine
          });
        }
      }
    }
  }

  return violations;
}

function run() {
  const diff = getGitDiff();
  if (!diff) {
    process.exit(0);
  }

  const violations = scanDiffForWeakening(diff);

  if (violations.length > 0) {
    console.error('\x1b[31m[Assertion Shield] CRITICAL ERROR: Deleted test assertions detected!\x1b[0m');
    console.error('Agents are prohibited from deleting or weakening test assertions.');
    console.error('Violations found:');
    
    violations.forEach(v => {
      console.error(`- File: ${v.file}`);
      console.error(`  Line: \x1b[33m${v.line}\x1b[0m`);
    });

    console.error('\nRestore the assertions, or — if removal is genuinely intended (e.g. the tested feature was removed) — a HUMAN may bypass locally with ASSERTION_SHIELD_BYPASS=true. The bypass is ignored in CI, and agents are prohibited from setting it (guard-bash hook).');

    const bypassRequested = process.env.ASSERTION_SHIELD_BYPASS === 'true';
    const inCI = process.env.CI === 'true' || process.env.CI === '1';
    if (bypassRequested && !inCI) {
      console.log('\x1b[33m[Assertion Shield] Warning: local bypass active. CI will still enforce this check.\x1b[0m');
    } else {
      if (bypassRequested && inCI) {
        console.error('\x1b[31m[Assertion Shield] Bypass requested in CI — refused. CI never honors the bypass.\x1b[0m');
      }
      process.exit(1);
    }
  } else {
    console.log('\x1b[32m[Assertion Shield] Check passed. No deleted assertions detected in test files.\x1b[0m');
  }
}

run();
