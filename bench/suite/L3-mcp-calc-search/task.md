# Task: build an MCP server (calc + search)

Build a **Model Context Protocol (MCP) server** using the **stdio transport** (newline-delimited JSON-RPC 2.0, one JSON object per line). It must expose exactly three tools:

- **`add(a, b)`** — return the sum of the two numbers `a` and `b`.
- **`search(query)`** — return the records in `corpus.json` whose title or body contains `query` (case-insensitive), each formatted as `{ "title": ..., "url": ... }`.
- **`get_record(id)`** — return the full record with that `id`, or an error result if no such record exists.

Requirements:
- Implement the MCP handshake: respond to `initialize` with a `protocolVersion` and `capabilities.tools`; respond to `tools/list` with the three tools, each carrying a JSON-Schema `inputSchema` (`type: "object"`).
- `tools/call` returns `{ "content": [ { "type": "text", "text": ... } ] }`; set `"isError": true` for bad input or not-found.
- A `corpus.json` file is provided in your working directory — **read it; do not modify it.**
- An **unknown method** must return a JSON-RPC error object (do not crash). **Bad tool arguments** must return an error *result* (do not crash).
- Your server entrypoint must be **`server.mjs`** (Node ESM), runnable as `node server.mjs` with no install step.

Write the server to `server.mjs`. That's the only required deliverable.
