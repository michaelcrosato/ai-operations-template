import { execSync } from 'child_process';
import * as path from 'path';

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

    console.error('\nPlease restore the assertions or verify the diff manually. To bypass in rare cases, set ASSERTION_SHIELD_BYPASS=true.');
    
    if (process.env.ASSERTION_SHIELD_BYPASS !== 'true') {
      process.exit(1);
    } else {
      console.log('\x1b[33m[Assertion Shield] Warning: Bypass environment variable detected. Continuing...\x1b[0m');
    }
  } else {
    console.log('\x1b[32m[Assertion Shield] Check passed. No deleted assertions detected in test files.\x1b[0m');
  }
}

run();
