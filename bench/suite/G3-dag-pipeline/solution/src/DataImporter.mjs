// DataImporter — implements the customer CSV import contract in docs/import-format.md.
// importCustomers(csvText) -> { inserted:[{name,email,phone}], rejected:[{row_number,reason}], status }
// Precedence of rejection reasons: name -> email -> phone -> duplicate.

const isAllDigits = (s) => /^[0-9]+$/.test(s);

/**
 * Validate + import customers from CSV text.
 * @param {string} csvText full CSV file text (header row `name,email,phone` + data rows).
 */
export function importCustomers(csvText) {
  const inserted = [];
  const rejected = [];

  const text = typeof csvText === 'string' ? csvText : '';
  // Split on either newline style; the header is the first line, data rows follow.
  const lines = text.split(/\r\n|\r|\n/);
  const dataLines = lines.slice(1); // drop header

  const seenEmails = new Set(); // lowercased emails already accepted

  let rowNumber = 0; // 1-based among NON-EMPTY data rows
  for (const rawLine of dataLines) {
    if (rawLine.trim() === '') continue; // skip blank lines (not counted as data rows)
    rowNumber += 1;

    const parts = rawLine.split(',');
    const name = (parts[0] ?? '').trim();
    const email = (parts[1] ?? '').trim();
    const phone = (parts[2] ?? '').trim();

    // Precedence: name -> email -> phone -> duplicate.
    if (name === '') {
      rejected.push({ row_number: rowNumber, reason: 'missing_name' });
      continue;
    }
    if ((email.match(/@/g) || []).length !== 1) {
      rejected.push({ row_number: rowNumber, reason: 'invalid_email' });
      continue;
    }
    if (phone !== '' && (!isAllDigits(phone) || phone.length < 7)) {
      rejected.push({ row_number: rowNumber, reason: 'invalid_phone' });
      continue;
    }
    const key = email.toLowerCase();
    if (seenEmails.has(key)) {
      rejected.push({ row_number: rowNumber, reason: 'duplicate_email' });
      continue;
    }

    seenEmails.add(key);
    inserted.push({ name, email, phone });
  }

  let status;
  if (inserted.length === 0) status = 'failed';
  else if (rejected.length === 0) status = 'completed';
  else status = 'completed_with_errors';

  return { inserted, rejected, status };
}

export default importCustomers;
