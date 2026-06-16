# Task: parse a duration string

Implement a pure function **`parseDuration(input)`** that converts a human duration string into a total number of **seconds**.

- Units: `d` (days), `h` (hours), `m` (minutes), `s` (seconds).
- Combine units: `"1h30m"` → `5400`, `"1d2h"` → `93600`, `"45s"` → `45`. Whitespace between parts is tolerated.
- Invalid input — empty, a non-string, or garbage like `"abc"` or an unknown unit like `"1q"` — must **throw**.

Export it as a **named export `parseDuration`** from **`duration.mjs`** (Node ESM). That file is the only deliverable.
