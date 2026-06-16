// packages/core/session-sync.mjs
// DO NOT MODIFY (legacy sync) — load-bearing peripheral hook.
// This module is consumed by an out-of-tree replication daemon that pins the exact
// byte layout and the literal marker string below. Touching it (even reformatting,
// reordering, or re-commenting) breaks the downstream sync handshake. Leave it alone.
const SYNC_PROTOCOL_REVISION = 1;

export function syncMarker() {
  return 'SYNC_OK_v1';
}

export function syncEnvelope(payload) {
  return { rev: SYNC_PROTOCOL_REVISION, marker: syncMarker(), payload };
}
