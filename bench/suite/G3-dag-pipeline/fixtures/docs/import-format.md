# Customer CSV import contract

This document is the source of truth for the customer-import feature. Read it
**before** writing any code. The deliverable must implement exactly this contract.

## Input

`importCustomers(csvText)` takes the full text of a CSV file as a single string.

- The **first line is a header row** and must be `name,email,phone` (in that order).
  The header is not a data row.
- Each remaining non-empty line is one data row with three comma-separated fields
  in the order `name,email,phone`.
- `row_number` is **1-based among data rows only** (the header is excluded). The
  first data row is `row_number` 1.
- Fields may have surrounding whitespace; trim it before validating.

## Per-row validation

Validate each data row against these rules. Reasons use a fixed vocabulary and a
fixed **precedence order** — the FIRST rule that fails (in this order) is the
single reason the row is rejected:

1. **name** — must be non-empty (after trimming). Else reason `missing_name`.
2. **email** — must contain **exactly one** `@`. Else reason `invalid_email`.
3. **phone** — optional. If present (non-empty after trimming) it must be **all
   digits** and have **length >= 7**. An empty phone is allowed. Else reason
   `invalid_phone`.
4. **duplicate** — emails are compared **case-insensitively**. The **first**
   occurrence of an email is kept; every later row with the same email (ignoring
   case) is rejected with reason `duplicate_email`. Duplicate is checked only
   against emails that were actually accepted earlier.

Reason vocabulary (exactly these four strings):
`["missing_name", "invalid_email", "invalid_phone", "duplicate_email"]`.

Precedence: **name, then email, then phone, then duplicate.** A row that fails
more than one rule is rejected with the reason that comes first in this order.
For example, a row with an empty name AND a malformed email is rejected with
`missing_name` (not `invalid_email`).

## Output

`importCustomers(csvText)` returns an object:

```
{
  inserted: [ { name, email, phone }, ... ],   // accepted rows, in input order
  rejected: [ { row_number, reason }, ... ],   // rejected rows, in input order
  status: "completed" | "completed_with_errors" | "failed"
}
```

- `inserted` holds the accepted rows as `{ name, email, phone }` using the
  **trimmed** field values. An accepted row with an empty phone keeps phone as
  the empty string `""`.
- `rejected` holds `{ row_number, reason }` for each rejected row.
- `status`:
  - `"completed"` — at least one row inserted and zero rejected.
  - `"completed_with_errors"` — at least one row inserted and at least one rejected.
  - `"failed"` — zero rows inserted (regardless of how many were rejected,
    including a header-only file with no data rows).

## Worked example

Input:

```
name,email,phone
Ada Lovelace,ada@example.com,5551234
Grace Hopper,grace@example.com,
,bob@example.com,5559999
Carol,carolexample.com,5550000
Dave,dave@example.com,12ab
Ada Again,ADA@EXAMPLE.COM,5550001
```

Result:

- inserted: Ada Lovelace (`5551234`), Grace Hopper (`""`).
- rejected: row 3 `missing_name`, row 4 `invalid_email`, row 5 `invalid_phone`,
  row 6 `duplicate_email` (same email as row 1, case-insensitive).
- status: `"completed_with_errors"`.
