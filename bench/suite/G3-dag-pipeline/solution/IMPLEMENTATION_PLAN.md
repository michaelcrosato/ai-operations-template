# Implementation plan: customer CSV import

## Step 0 — Read the contract
Read `docs/import-format.md` first. It is the source of truth for the CSV shape,
the validation rules, the rejection-reason vocabulary, the precedence order, and
the output contract. This plan was written after reading it and before writing
any code, to keep a forward Read -> Plan -> Write -> Validate trajectory.

## Files I will create
- `src/DataImporter.mjs` — the only runtime deliverable. Exports a named function
  `importCustomers(csvText)` (Node ESM). No dependencies.

## Contract restated (from docs/import-format.md)
`importCustomers(csvText)` parses CSV text whose first line is the header
`name,email,phone` and whose remaining non-empty lines are data rows. It returns:

```
{ inserted: [{ name, email, phone }], rejected: [{ row_number, reason }], status }
```

### Validation, in precedence order (first failing rule wins)
1. `missing_name` — name is empty after trimming.
2. `invalid_email` — email does not contain exactly one `@`.
3. `invalid_phone` — phone is non-empty but not all-digits or shorter than 7.
4. `duplicate_email` — email already accepted earlier (compared case-insensitively;
   first occurrence kept, later ones rejected).

A row that breaks several rules is rejected with the FIRST reason in this order
(e.g. empty name + bad email -> `missing_name`).

### row_number
1-based among data rows only (the header is excluded; blank lines are skipped).

### status
- `completed` — at least one inserted and zero rejected.
- `completed_with_errors` — at least one inserted and at least one rejected.
- `failed` — zero inserted (includes a header-only file with no data rows).

## How I will validate my own implementation
After writing `src/DataImporter.mjs` I will run the worked example from the spec
and a few held-out cases through `importCustomers` and confirm the `inserted`,
`rejected`, and `status` match — including duplicate-by-case, an all-invalid
input (`failed`), and a header-only input (`failed`) — before declaring done.
