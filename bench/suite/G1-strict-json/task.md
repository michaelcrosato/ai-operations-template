# Task: transform accounts.csv into a strict, minified JSON report

This workspace contains a file **`accounts.csv`**. Read it, apply the transform below, and write a single deliverable file named **`benchmark-output.json`** at the workspace root. Output discipline is graded as strictly as correctness — read the OUTPUT RULES carefully.

## Input — `accounts.csv`
A header row plus data rows. Columns: `account_id,email,plan,enabled`. Fields are simple (no embedded commas or quotes), so a plain comma split per line is correct.

## The transform (apply exactly)
- **row_number** = the 1-based index of a row among the **data rows only** (the header is not counted). Count **all** data rows, including disabled ones — so the first data row is `row_number` 1, the second is 2, and so on, regardless of whether any row is disabled.
- **input_rows** = the total number of data rows (again, including disabled rows).
- **enabled** parsing (case-insensitive): `TRUE`, `true`, `1`, `yes` → enabled. `FALSE`, `false`, `0`, `no`, or an empty value → disabled.
- **Disabled rows are excluded entirely** — they go into **neither** `valid_accounts` **nor** `rejected_rows`. Only **enabled** rows are considered for accept/reject.
- An enabled row is a **valid account** when ALL of these hold:
  - `account_id` is non-empty,
  - `email` contains **exactly one** `@`,
  - `plan` is one of `free`, `pro`, `enterprise`.
- **valid enabled rows** → append to **`valid_accounts`** as `{ "account_id", "email", "plan" }`, **preserving input order**.
- **invalid enabled rows** → append to **`rejected_rows`** as `{ "row_number", "account_id", "reason" }`. The `reason` must come from this fixed vocabulary: `"missing_account_id"`, `"invalid_email"`, `"invalid_plan"`. When a row violates more than one rule, use this **precedence** (first match wins): missing `account_id` → `"missing_account_id"`; else bad email → `"invalid_email"`; else bad plan → `"invalid_plan"`.
- **summary** = `{ "input_rows", "accepted", "rejected" }` where `accepted` is the length of `valid_accounts` and `rejected` is the length of `rejected_rows`.

## Output rules (graded — do not deviate)
- Write exactly one file: **`benchmark-output.json`** at the workspace root. Create **no other files**.
- The file must be a **single JSON object**, **MINIFIED**: one line, no pretty-printing, no indentation, no extra spaces, no trailing newline-formatting tricks.
- **No markdown.** No ```` ``` ```` code fences, no prose, no commentary — the file's bytes must be pure JSON that `JSON.parse` accepts.
- The top-level keys must be **exactly these four, in this order**: `"schema_version"`, `"valid_accounts"`, `"rejected_rows"`, `"summary"`.
- `"schema_version"` must be the string `"1.0"`.
- **Do not modify `accounts.csv`** in any way (changing it is an automatic failure).

## Example shape (illustrative only — not the answer)
```
{"schema_version":"1.0","valid_accounts":[{"account_id":"x1","email":"x@y.com","plan":"pro"}],"rejected_rows":[{"row_number":3,"account_id":"","reason":"missing_account_id"}],"summary":{"input_rows":5,"accepted":1,"rejected":2}}
```

## Done when
`benchmark-output.json` exists at the workspace root, is a minified single-line JSON object with the exact ordered keys above, and correctly reflects the transform applied to `accounts.csv` — with `accounts.csv` left untouched and no extra files created.
