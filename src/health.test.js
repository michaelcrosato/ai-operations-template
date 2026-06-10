'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { getHealth } = require('./health.js');

const HEALTH_CLI = path.join(__dirname, 'health.js');

test('getHealth() reports status ok and the correct service name', () => {
  const health = getHealth();
  assert.equal(health.status, 'ok');
  assert.equal(health.service, 'ai-operations-template');
});

test('getHealth() timestamp parses to a valid ISO-8601 Date', () => {
  const health = getHealth();
  assert.equal(typeof health.timestamp, 'string');
  const parsed = new Date(health.timestamp);
  assert.ok(!Number.isNaN(parsed.getTime()), 'timestamp must parse to a valid Date');
  assert.equal(parsed.toISOString(), health.timestamp, 'timestamp must be ISO-8601');
});

test('getHealth() uptime_s is a non-negative number', () => {
  const health = getHealth();
  assert.equal(typeof health.uptime_s, 'number');
  assert.ok(health.uptime_s >= 0, 'uptime_s must be >= 0');
});

test('CLI: node src/health.js exits 0 and prints JSON with status ok', () => {
  // execFileSync throws on a non-zero exit code, so reaching the assertions
  // below already proves exit 0.
  const stdout = execFileSync(process.execPath, [HEALTH_CLI], { encoding: 'utf8' });
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.service, 'ai-operations-template');
});
