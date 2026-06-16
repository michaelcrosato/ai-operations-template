// Reference solution for the L1 parse-duration task. Pure function, single file.
// Parses a human duration string ("1h30m", "45s", "2d", "1d2h30m") into total SECONDS.
// Units: d, h, m, s. Whitespace tolerant. Throws on invalid/empty/garbage input.

export function parseDuration(input) {
  if (typeof input !== 'string') throw new TypeError('parseDuration expects a string');
  const s = input.trim();
  if (!s) throw new Error('empty duration');
  const mult = { d: 86400, h: 3600, m: 60, s: 1 };
  const re = /(\d+)\s*([dhms])/g;
  let total = 0;
  let matched = false;
  let m;
  while ((m = re.exec(s)) !== null) {
    matched = true;
    total += Number(m[1]) * mult[m[2]];
  }
  // The whole string must be consumed by valid <number><unit> pairs (no leftover garbage).
  if (!matched || s.replace(/(\d+)\s*[dhms]/g, '').trim() !== '') {
    throw new Error(`invalid duration: ${input}`);
  }
  return total;
}
