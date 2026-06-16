#!/usr/bin/env node
// Reference solution for the L3 MCP-server benchmark task.
// A minimal Model Context Protocol server over the stdio transport: newline-delimited
// JSON-RPC 2.0. Exposes three tools: add, search, get_record. Reads ./corpus.json (cwd).
// This is the ORACLE'S reference — it must pass the oracle 1.0. Agents build their own.

import * as fs from 'node:fs';
import * as readline from 'node:readline';

const PROTOCOL_VERSION = '2024-11-05';
let corpus = { records: [] };
try {
  corpus = JSON.parse(fs.readFileSync('./corpus.json', 'utf8'));
} catch {
  // A server that can't find its corpus still speaks the protocol; search/get_record just return empty/errors.
}

const TOOLS = [
  {
    name: 'add',
    description: 'Add two integers and return the sum.',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
  },
  {
    name: 'search',
    description: 'Search the corpus by query; returns matching {title,url} records.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'get_record',
    description: 'Fetch a full record by id, or an error if not found.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];

function textResult(text, isError = false) {
  return { content: [{ type: 'text', text: String(text) }], isError };
}

function callTool(name, args) {
  args = args || {};
  if (name === 'add') {
    if (typeof args.a !== 'number' || typeof args.b !== 'number') return textResult('add requires numeric a and b', true);
    return textResult(args.a + args.b);
  }
  if (name === 'search') {
    if (typeof args.query !== 'string') return textResult('search requires a string query', true);
    const q = args.query.toLowerCase();
    const hits = corpus.records
      .filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(q))
      .map((r) => ({ title: r.title, url: r.url }));
    return textResult(JSON.stringify(hits));
  }
  if (name === 'get_record') {
    if (typeof args.id !== 'string') return textResult('get_record requires a string id', true);
    const rec = corpus.records.find((r) => r.id === args.id);
    if (!rec) return textResult(`record not found: ${args.id}`, true);
    return textResult(JSON.stringify(rec));
  }
  return textResult(`unknown tool: ${name}`, true);
}

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return; // ignore unparseable lines
  }
  const { id, method, params } = req;
  // Notifications carry no id and get no response.
  if (id === undefined || id === null) return;

  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'calc-search', version: '1.0.0' } } });
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  } else if (method === 'tools/call') {
    const result = callTool(params?.name, params?.arguments);
    send({ jsonrpc: '2.0', id, result });
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
  }
});
