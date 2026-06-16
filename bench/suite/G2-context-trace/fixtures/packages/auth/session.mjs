// packages/auth/session.mjs — session validity helpers.
// Derives expiry purely from the source constant; no local copy of the TTL.
import { TOKEN_TTL_SECONDS } from './config.mjs';

export function isExpired(issuedAtSec, nowSec) {
  return (nowSec - issuedAtSec) >= TOKEN_TTL_SECONDS;
}
