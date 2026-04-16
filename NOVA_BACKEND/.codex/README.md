# Codex Notes

This folder contains agent-facing documentation for the backend.

## Files

- `agent.md`
  - Short entrypoint for agents.
  - Tells the agent which domain docs to read for a task.

- `domains/architecture.md`
  - High-level repo layout and file ownership by layer.

- `domains/auth.md`
  - Authentication flow, bearer token model, home/user structure, and auth route expectations.

- `domains/recipe.md`
  - Recipe-specific route, model, and logic conventions.

- `domains/receipt.md`
  - Receipt-specific route, model, logic, and storage-key expectations.

- `domains/infrastructure.md`
  - Shared infrastructure rules: database setup, logging, OpenAI integration, env vars, and verification.

## How To Use These Docs

- Load only the domain files needed for the task.
- The backend agent may inspect `../NOVA_UI` for context, but it should not modify frontend files.
- If code and docs disagree, inspect the code and then update the docs to match the intended pattern.

## Good First Files To Inspect In Code

- `main.py`
- `config.py`
- `backend/db_management/internal.py`
- `backend/db_management/setup.py`
- `backend/auth/`
- The domain module being changed
