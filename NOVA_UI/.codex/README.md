# NOVA UI Codex Docs

This folder contains agent-facing guidance for `NOVA_UI`.

## Files

- `agent.md`
  - Short entrypoint for agents.
  - Tells the agent where to start and which focused docs to load next.

- `repo_shape.md`
  - Repo layout, file ownership, and the expected feature structure.

- `api_guidelines.md`
  - Rules for request building, response normalization, backend coordination, and safe API-layer changes.

- `feature_notes.md`
  - Current product behavior, known quirks, and safe extension points.

- `ui_guidelines.md`
  - Visual language, interaction expectations, and UI copy rules.

## How To Use These Docs

- Start with `agent.md`.
- Read only the focused docs needed for the task.
- The frontend agent may inspect `../NOVA_BACKEND` for context, but it should not modify backend files.
- If code and docs disagree, inspect the code and then update the docs to match the intended pattern.

## Good First Files To Inspect In Code

- `app/page.tsx`
- `app/recipes/page.tsx`
- `app/receipts/page.tsx`
- `lib/api.ts`
- `lib/apps.ts`
- the feature component you are changing under `components/`
