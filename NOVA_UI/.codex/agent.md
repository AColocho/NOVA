# NOVA UI Agent Start Here

Read `.codex/README.md` first, then load only the focused docs needed for the task.

Minimum docs by task:

- repo layout or file ownership: `.codex/repo_shape.md`
- API calls or data shaping: `.codex/api_guidelines.md`
- feature behavior or known quirks: `.codex/feature_notes.md`
- visual or copy decisions: `.codex/ui_guidelines.md`

Working rules:

- Keep route files thin and put screen logic in `components/<feature>/`.
- Keep request building and response normalization in `lib/api.ts`.
- Match the existing receipts and recipes patterns before adding a new one.
- Inspect the sibling backend in `../NOVA_BACKEND` when frontend behavior depends on backend payloads or route behavior.
- Do not modify `../NOVA_BACKEND` from the frontend agent. The backend may be inspected for context only.
- If a frontend issue is caused by backend behavior or a backend bug, do not fix it from here. Flag the issue clearly and tell the developer what backend problem you found.
- Run targeted verification before finishing.
