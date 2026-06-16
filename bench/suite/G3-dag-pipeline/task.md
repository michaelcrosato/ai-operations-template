# Task: build the customer CSV importer — following a mandated DAG

This workspace contains a written contract at **`docs/import-format.md`**. You must
deliver a working importer that implements that contract exactly. Just as
important as the result: you must follow a **mandated sequence of steps** (a DAG).
Do **not** skip ahead to writing code.

## Mandated trajectory (do these in order — do not skip the plan)
1. **READ** `docs/import-format.md` end to end, and inspect the workspace, before
   writing anything. It is the source of truth for the CSV shape, the validation
   rules, the rejection-reason vocabulary, the precedence order, and the output.
2. **PLAN** — write a file named **`IMPLEMENTATION_PLAN.md`** at the **workspace
   root**. It must list the files you will create and restate the contract:
   mention the function name `importCustomers` and at least two of the three
   status states (`completed`, `completed_with_errors`, `failed`).
3. **WRITE** the implementation: **`src/DataImporter.mjs`** (Node ESM), exporting
   a **named export `importCustomers(csvText)`**.
4. **VALIDATE** your own implementation against the worked example in the spec and
   a few cases of your own before declaring done.

Keep a **forward Read -> Plan -> Write -> Validate** trajectory. Write the plan
**before** the implementation. The runner prices backtracking and re-work through
its iteration/turn telemetry, so jumping straight to code (or thrashing between
steps) costs you — a disciplined run is short and forward-only.

## The deliverable contract (summarized from docs/import-format.md — that file wins on any detail)
`importCustomers(csvText)` takes the full CSV text (first line is the header
`name,email,phone`; the remaining non-empty lines are data rows) and returns:

```
{
  inserted: [ { name, email, phone }, ... ],   // accepted rows, in input order, trimmed
  rejected: [ { row_number, reason }, ... ],   // rejected rows, in input order
  status: "completed" | "completed_with_errors" | "failed"
}
```

- `row_number` is **1-based among data rows only** (header excluded; blank lines skipped).
- Validation, in **precedence order** (the first failing rule is the single reason):
  1. `missing_name` — name empty after trimming.
  2. `invalid_email` — email does not contain **exactly one** `@`.
  3. `invalid_phone` — phone is optional, but if present must be **all digits** and
     **length >= 7**. An empty phone is allowed (kept as `""`).
  4. `duplicate_email` — emails compared **case-insensitively**; the **first**
     occurrence is kept, later duplicates are rejected.
- Reason vocabulary is exactly `["missing_name","invalid_email","invalid_phone","duplicate_email"]`.
- `status`: `completed` = >=1 inserted and 0 rejected; `completed_with_errors` =
  >=1 inserted and >=1 rejected; `failed` = 0 inserted (a header-only file is `failed`).

## Done when
- `IMPLEMENTATION_PLAN.md` exists at the workspace root (the Plan phase), **and**
- `src/DataImporter.mjs` exports `importCustomers(csvText)` implementing the
  contract exactly — correct `inserted`, `rejected` (with `row_number` + `reason`
  by precedence), and `status` for any input, not just the worked example.
