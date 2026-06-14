# F-0021 — Viewer read-only RBAC: UI walkthrough evidence

Per `.claude/rules/frontend.md` ("UI features ... must include the E2E run **or** screenshots from walking it like a user"). Walked the live demo (`npm run dev`, /demo) as a **viewer** persona and verified the read-only enforcement. Screenshot: `viewer-readonly.png` (this dir). The full automated Playwright E2E program is groomed separately (see DECISIONS / F-0024).

## What was verified live (DOM-asserted, reproducible)

Switched the on-page **Persona** selector (`[data-testid="persona-select"]`, options Owner/Admin/Editor/Viewer) to **Viewer**, then on the Operations Center → Visual Workflow canvas:

- **Main palette disabled for viewer:** the 5 mutation buttons (`+agent`, `+tool`, `+gate`, `+parallel`, `+merge`) report `disabled = true`.
- **Prompt-to-node input is read-only:** placeholder reads `Read-only: viewers cannot create nodes`.
- **Properties panel blocks edits:** selecting a node surfaces `[data-testid="viewer-readonly-notice"]` with text **"Read-only: viewers cannot edit the graph"**; the Label / Prompt / Model / Est. cost fields are disabled.
- **19 controls disabled** overall in the viewer state (inputs/textareas/buttons), vs the owner state where they are enabled.
- Mutation handlers also guard server-of-truth: every edit path (`handleCreateFromPrompt`, `addNodeOfType`, drag, delete, save/import/publish templates, load graph) returns early with a `rejectViewerEdit(...)` toast when `canEdit` is false, and the canvas `onChange` is gated — so a viewer cannot mutate the cloned seed graph even via the canvas.

## Owner contrast
With the persona set back to **Owner**, the same controls are enabled and the read-only notice is absent — confirming the gate is role-driven, not globally disabled.

## Backing engine + unit proof
- `src/forge/rbac.js` `check(principal,res,act)` — two-principal + resource-scoped tests in `src/forge/rbac.test.js` (owner/editor allowed on graph mutation, viewer denied; editor denied on org/billing so it never exceeds admin).
- `src/forge/canEdit.test.js` — `userCanEdit(role)` is false for viewer, true for owner/admin/editor.
- Full gate: `verify.log` in this dir → `VERIFY: PASS (exit 0)`, 27 unit tests, 190 hook contract tests, 0 failed.

## Known minor follow-up (non-blocking)
The in-canvas (React Flow) palette buttons still appear enabled and emit a success toast before the gated `onChange` no-ops — the graph is **not** mutated (safe), but the rejection is not shown there. Tracked for the canvas-polish/E2E feature.
