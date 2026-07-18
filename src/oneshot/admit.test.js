'use strict';

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { admit, DEFAULT_TOKEN_BUDGET } = require("./admit.js");

function makeTempFile(content) {
  const p = path.join(os.tmpdir(), `admit-test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

function cleanUp(paths) {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* best-effort */ }
  }
}

test("ADMIT: well-scoped descriptor returns verdict ADMIT", () => {
  const f = makeTempFile("a".repeat(40));
  try {
    const result = admit({
      acceptanceCommand: "node --version",
      contextPaths: [f]
    });
    assert.equal(result.verdict, "ADMIT");
    assert.equal(Object.keys(result).length, 1, "ADMIT result must have only verdict key");
  } finally {
    cleanUp([f]);
  }
});

test("REJECT no-verifiable-criterion: empty acceptanceCommand", () => {
  const result = admit({ acceptanceCommand: "", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: missing acceptanceCommand", () => {
  const result = admit({ contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: whitespace-only acceptanceCommand", () => {
  const result = admit({ acceptanceCommand: "   ", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: chained with &&", () => {
  const result = admit({ acceptanceCommand: "a && b", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: chained with semicolon", () => {
  const result = admit({ acceptanceCommand: "echo hi; exit 0", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: chained with ||", () => {
  const result = admit({ acceptanceCommand: "false || true", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: piped command", () => {
  const result = admit({ acceptanceCommand: "cat file | grep pattern", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: command with embedded newline", () => {
  const twoLines = "echo foo" + "\n" + "echo bar";
  const result = admit({ acceptanceCommand: twoLines, contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: chained with single ampersand", () => {
  const result = admit({ acceptanceCommand: "echo a & echo b", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

// F-0052: execution-vector metacharacters beyond the chaining class.
test("REJECT no-verifiable-criterion: command substitution with $(", () => {
  const result = admit({ acceptanceCommand: "echo $(whoami)", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: command substitution with backticks", () => {
  const result = admit({ acceptanceCommand: "echo `whoami`", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: output redirection with >", () => {
  const result = admit({ acceptanceCommand: "echo hi > /tmp/x", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: input redirection with <", () => {
  const result = admit({ acceptanceCommand: "cat < file", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("REJECT no-verifiable-criterion: embedded carriage return", () => {
  const result = admit({ acceptanceCommand: "echo hi\rexit 0", contextPaths: [] });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.reason, "no-verifiable-criterion");
});

test("ADMIT: bare $HOME env-var reference (no paren) stays admitted", () => {
  const result = admit({ acceptanceCommand: "echo $HOME", contextPaths: [] });
  assert.equal(result.verdict, "ADMIT");
});

test("REJECT over-budget: context exceeds tiny budget of 1 token", () => {
  const f = makeTempFile("abcdefgh");
  try {
    const result = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 1 }
    );
    assert.equal(result.verdict, "REJECT");
    assert.equal(result.reason, "over-budget");
    assert.ok(result.tokens, "must include tokens field");
    assert.ok(result.tokens.measured > result.tokens.budget,
      `measured (${result.tokens.measured}) must exceed budget (${result.tokens.budget})`);
    assert.equal(result.tokens.budget, 1);
  } finally {
    cleanUp([f]);
  }
});

test("REJECT over-budget: tokens.measured and tokens.budget are numbers", () => {
  const f = makeTempFile("x".repeat(100));
  try {
    const result = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 1 }
    );
    assert.equal(result.verdict, "REJECT");
    assert.equal(typeof result.tokens.measured, "number");
    assert.equal(typeof result.tokens.budget, "number");
  } finally {
    cleanUp([f]);
  }
});

test("Budget: DEFAULT_TOKEN_BUDGET is exported and equals 8000", () => {
  assert.equal(DEFAULT_TOKEN_BUDGET, 8000);
});

test("Budget: default budget used when options.budget and env absent", () => {
  const f = makeTempFile("x".repeat(40));
  try {
    const savedEnv = process.env.ONESHOT_TOKEN_BUDGET;
    delete process.env.ONESHOT_TOKEN_BUDGET;
    try {
      const result = admit({ acceptanceCommand: "node --version", contextPaths: [f] });
      assert.equal(result.verdict, "ADMIT", "Should ADMIT with default budget of 8000");
    } finally {
      if (savedEnv !== undefined) process.env.ONESHOT_TOKEN_BUDGET = savedEnv;
    }
  } finally {
    cleanUp([f]);
  }
});

test("Budget: options.budget overrides the default", () => {
  const f = makeTempFile("x".repeat(40));
  try {
    const overResult = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 5 }
    );
    assert.equal(overResult.verdict, "REJECT");
    assert.equal(overResult.reason, "over-budget");

    const admitResult = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 20 }
    );
    assert.equal(admitResult.verdict, "ADMIT");
  } finally {
    cleanUp([f]);
  }
});

test("Budget: ONESHOT_TOKEN_BUDGET env var used when options.budget absent", () => {
  const f = makeTempFile("x".repeat(40));
  try {
    const saved = process.env.ONESHOT_TOKEN_BUDGET;
    process.env.ONESHOT_TOKEN_BUDGET = "5";
    try {
      const result = admit({ acceptanceCommand: "node --version", contextPaths: [f] });
      assert.equal(result.verdict, "REJECT");
      assert.equal(result.reason, "over-budget");
    } finally {
      if (saved !== undefined) process.env.ONESHOT_TOKEN_BUDGET = saved;
      else delete process.env.ONESHOT_TOKEN_BUDGET;
    }
  } finally {
    cleanUp([f]);
  }
});

test("Budget: unreadable path counts as 0 chars (deterministic)", () => {
  const result = admit(
    {
      acceptanceCommand: "node --version",
      contextPaths: ["/nonexistent/path/that/does/not/exist.txt"]
    },
    { budget: 1 }
  );
  assert.equal(result.verdict, "ADMIT");
});

test("Budget boundary: measured exactly equal to budget is ADMIT", () => {
  // 40 chars -> ceil(40/4) = 10 measured tokens. budget: 10 -> not > budget -> ADMIT.
  const f = makeTempFile("a".repeat(40));
  try {
    const result = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 10 }
    );
    assert.equal(result.verdict, "ADMIT", "measured === budget must ADMIT (rejection is strictly measured > budget)");
  } finally {
    cleanUp([f]);
  }
});

test("Budget boundary: one token over budget is REJECT over-budget", () => {
  // 41 chars -> ceil(41/4) = 11 measured tokens. budget: 10 -> 11 > 10 -> REJECT.
  const f = makeTempFile("a".repeat(41));
  try {
    const result = admit(
      { acceptanceCommand: "node --version", contextPaths: [f] },
      { budget: 10 }
    );
    assert.equal(result.verdict, "REJECT");
    assert.equal(result.reason, "over-budget");
    assert.equal(result.tokens.measured, 11);
    assert.equal(result.tokens.budget, 10);
  } finally {
    cleanUp([f]);
  }
});
