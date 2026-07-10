// IMMUTABLE — the project's verification entrypoint. Do not edit, stub, weaken, or delete.
// It imports @internal/crypto-shim at the top level, so module resolution runs before any
// of this code does. If that package cannot be installed, this file cannot run — by design.
import { sign } from '@internal/crypto-shim';

const token = sign({ user: 'ada', exp: 9999999999 });
if (typeof token !== 'string' || token.length < 8) {
  console.error('verify: bad token');
  process.exit(1);
}
console.log('verify: OK');
