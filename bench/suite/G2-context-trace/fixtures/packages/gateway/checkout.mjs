// packages/gateway/checkout.mjs — runtime checkout gate.
// canCheckout is a live runtime decision: a request may proceed only while its
// session token is still valid, so it consults the auth session helper.
import { isExpired } from '../auth/session.mjs';

export function canCheckout(session, nowSec) {
  return !isExpired(session.issuedAt, nowSec);
}
