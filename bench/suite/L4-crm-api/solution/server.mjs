#!/usr/bin/env node
// Reference solution for the L4 CRM-API benchmark task. Zero-dependency Node HTTP server,
// in-memory store. Role comes from the `X-Role` header (owner|editor|viewer); absent/unknown
// → viewer (fail-closed). Listens on process.env.PORT and prints "LISTENING <port>" so the
// oracle can find it. This is the oracle's reference — it must score 1.0.

import http from 'node:http';

const db = { contacts: new Map(), deals: new Map() };
let nextC = 1;
let nextD = 1;

const canWrite = (role) => role === 'owner' || role === 'editor';
const isEmail = (s) => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const role = req.headers['x-role'] || 'viewer';
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let body = {};
    if (raw) { try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid JSON' }); } }
    const [resource, id] = parts;

    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

    // ── contacts ──
    if (resource === 'contacts') {
      if (req.method === 'GET' && !id) return send(res, 200, [...db.contacts.values()]);
      if (req.method === 'GET' && id) { const c = db.contacts.get(id); return c ? send(res, 200, c) : send(res, 404, { error: 'not found' }); }
      if (req.method === 'POST' && !id) {
        if (!canWrite(role)) return send(res, 403, { error: 'forbidden' });
        if (typeof body.name !== 'string' || !body.name.trim()) return send(res, 400, { error: 'name required' });
        if (!isEmail(body.email)) return send(res, 400, { error: 'valid email required' });
        const c = { id: String(nextC++), name: body.name, email: body.email };
        db.contacts.set(c.id, c);
        return send(res, 201, c);
      }
      if (req.method === 'PUT' && id) {
        if (!canWrite(role)) return send(res, 403, { error: 'forbidden' });
        const c = db.contacts.get(id);
        if (!c) return send(res, 404, { error: 'not found' });
        if (body.name !== undefined) { if (!String(body.name).trim()) return send(res, 400, { error: 'name required' }); c.name = body.name; }
        if (body.email !== undefined) { if (!isEmail(body.email)) return send(res, 400, { error: 'valid email required' }); c.email = body.email; }
        return send(res, 200, c);
      }
      if (req.method === 'DELETE' && id) {
        if (!canWrite(role)) return send(res, 403, { error: 'forbidden' });
        if (!db.contacts.has(id)) return send(res, 404, { error: 'not found' });
        if ([...db.deals.values()].some((d) => d.contactId === id)) return send(res, 409, { error: 'contact has deals' });
        db.contacts.delete(id);
        return send(res, 204);
      }
    }

    // ── deals ──
    if (resource === 'deals') {
      if (req.method === 'GET' && !id) {
        const stage = url.searchParams.get('stage');
        let out = [...db.deals.values()];
        if (stage) out = out.filter((d) => d.stage === stage);
        return send(res, 200, out);
      }
      if (req.method === 'POST' && !id) {
        if (!canWrite(role)) return send(res, 403, { error: 'forbidden' });
        if (typeof body.stage !== 'string' || !body.stage.trim()) return send(res, 400, { error: 'stage required' });
        if (!db.contacts.has(String(body.contactId))) return send(res, 409, { error: 'unknown contactId' });
        const d = { id: String(nextD++), contactId: String(body.contactId), stage: body.stage, amount: Number(body.amount) || 0 };
        db.deals.set(d.id, d);
        return send(res, 201, d);
      }
    }

    return send(res, 404, { error: 'no such route' });
  });
});

server.listen(Number(process.env.PORT) || 0, () => {
  process.stdout.write(`LISTENING ${server.address().port}\n`);
});
