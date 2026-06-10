import * as fs from 'fs';
import * as path from 'path';

/**
 * RuleForge-Lite: Automatically syncs and validates build/test commands
 * in CLAUDE.md against local package configuration files.
 */

const CLAUDE_PATH = path.join(process.cwd(), 'CLAUDE.md');

function detectStack(): { buildCmd: string; testCmd: string } {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const cargoTomlPath = path.join(process.cwd(), 'Cargo.toml');
  const pyprojectPath = path.join(process.cwd(), 'pyproject.toml');

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const isPnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));
    const isYarn = fs.existsSync(path.join(process.cwd(), 'yarn.lock'));
    const runner = isPnpm ? 'pnpm' : isYarn ? 'yarn' : 'npm';

    const buildCmd = pkg.scripts?.build ? `${runner} run build` : `${runner} build`;
    const testCmd = pkg.scripts?.test ? `${runner} test` : `${runner} run test`;
    return { buildCmd, testCmd };
  }

  if (fs.existsSync(cargoTomlPath)) {
    return { buildCmd: 'cargo build', testCmd: 'cargo test' };
  }

  if (fs.existsSync(pyprojectPath)) {
    return { buildCmd: 'pip install .', testCmd: 'pytest' };
  }

  return { buildCmd: 'make build', testCmd: 'make test' };
}

function verifyClaudeMd() {
  if (!fs.existsSync(CLAUDE_PATH)) {
    console.log('CLAUDE.md not found. Generating default...');
    const stack = detectStack();
    const template = `# Agent Constitution

## 1. Commands
- **Build**: ${stack.buildCmd}
- **Test**: ${stack.testCmd}

## 2. Guidelines
- Keep code clean and modular.
- Always run the test command before committing.
`;
    fs.writeFileSync(CLAUDE_PATH, template, 'utf8');
    console.log('CLAUDE.md generated successfully.');
    return;
  }

  const content = fs.readFileSync(CLAUDE_PATH, 'utf8');
  const stack = detectStack();

  if (!content.includes(stack.buildCmd)) {
    console.warn(`[Warning] CLAUDE.md might be missing the current build command: "${stack.buildCmd}"`);
  }
  if (!content.includes(stack.testCmd)) {
    console.warn(`[Warning] CLAUDE.md might be missing the current test command: "${stack.testCmd}"`);
  }
}

try {
  verifyClaudeMd();
} catch (error) {
  console.error('Error running RuleForge-Lite verification:', error);
  process.exit(1);
}
