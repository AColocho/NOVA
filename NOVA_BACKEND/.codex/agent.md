# NOVA Backend Agent Guide

Read `.codex/README.md` first, then load only the domain notes relevant to the task.

Minimum domain files:

- `.codex/domains/architecture.md`
- `.codex/domains/auth.md`
- `.codex/domains/recipe.md`
- `.codex/domains/receipt.md`
- `.codex/domains/infrastructure.md`

Working rules:

- Keep routes thin and keep business logic in `Logic` classes.
- Match existing patterns before introducing a new one.
- Keep `.env`, docs, and code in sync when adding config or changing behavior.
- When changing auth, also inspect data ownership in `backend/db_management/internal.py`.
- When changing persistence shape, update `backend/db_management/setup.py`.
- Do not modify `../NOVA_UI` from the backend agent. The frontend may be inspected for context only.
- If a backend task is blocked by frontend behavior or exposes a frontend bug, do not fix it from here. Flag the issue clearly and tell the developer what frontend problem you found.
- Run targeted verification before finishing.
