# Contributing to NOVA

NOVA accepts both manual contributions and agent-assisted contributions. Keep changes focused, document behavior changes, and verify the part of the stack you touched before opening a pull request.

## General Guidelines

- Keep pull requests small enough to review without guesswork.
- Do not commit secrets, `.env` files, tokens, or local credentials.
- Update docs when you change behavior, configuration, or project structure.
- Match the existing patterns in each app before introducing a new one.
- If a change affects both frontend and backend behavior, describe the dependency clearly in the pull request.

## Manual Contributions

1. Read the root [README.md](README.md) and any subproject README relevant to your change.
2. Create a branch for the work.
3. Make the smallest change that solves the problem cleanly.
4. Run the checks that apply to the area you changed.
5. Open a pull request with a short summary and a verification note.

### Backend

Backend work lives in `NOVA_BACKEND/`.

- Follow the existing FastAPI structure and keep routes thin.
- Put business logic in the existing logic-layer pattern instead of moving it into route handlers.
- If you change persistence or ownership behavior, inspect and update the related database setup files.
- If you add or change configuration, keep `.env` expectations and docs in sync.

Useful backend verification commands:

```bash
cd NOVA_BACKEND
uv run ruff check .
uv run isort --check-only .
```

If your change affects runtime behavior, also do a local smoke test with the backend running.

### Frontend

Frontend work lives in `NOVA_UI/`.

- Keep route files under `app/` thin and move feature UI into `components/<feature>/`.
- Put API request shaping and response normalization in `lib/api.ts`.
- Reuse the existing UI primitives and page structure before creating new abstractions.
- Keep user-facing copy plain and non-technical.

Useful frontend verification commands:

```bash
cd NOVA_UI
npm run lint
npm run build
```

### Testing Expectations

There is currently no full automated test suite checked into this repository. Until that changes, every pull request should include the checks you ran and any manual verification you performed.

## Agent-Assisted Contributions

Agent documentation lives inside each subproject's `.codex/` folder.

Backend agent files:

- `NOVA_BACKEND/.codex/agent.md`
- `NOVA_BACKEND/.codex/README.md`
- `NOVA_BACKEND/.codex/domains/architecture.md`
- `NOVA_BACKEND/.codex/domains/auth.md`
- `NOVA_BACKEND/.codex/domains/recipe.md`
- `NOVA_BACKEND/.codex/domains/receipt.md`
- `NOVA_BACKEND/.codex/domains/infrastructure.md`

Frontend agent files:

- `NOVA_UI/.codex/agent.md`
- `NOVA_UI/.codex/README.md`
- `NOVA_UI/.codex/repo_shape.md`
- `NOVA_UI/.codex/api_guidelines.md`
- `NOVA_UI/.codex/feature_notes.md`
- `NOVA_UI/.codex/ui_guidelines.md`

If you contribute with an agent:

- Start with the relevant `.codex/agent.md` file before making changes.
- Backend agents may inspect `NOVA_UI/` for context, but they should not modify frontend files.
- Frontend agents may inspect `NOVA_BACKEND/` for context, but they should not modify backend files.
- If the issue appears to live in the other app, flag it clearly and report what the agent found instead of fixing it cross-repo.
- Keep edits scoped to the requested area and avoid unrelated refactors.
- Update documentation when code and docs drift.
- Include the exact verification steps the agent ran in the pull request.
- Review the final patch manually before submitting it.

## Pull Request Notes

Every pull request should state:

- what changed
- why it changed
- what was verified
- any follow-up work or known limitations

Screenshots are helpful for UI changes. API or schema changes should call out any required environment, setup, or migration steps.

## CLA And Licensing

NOVA is publicly available under the GNU Affero General Public License v3.0. By intentionally submitting a contribution to this project, you agree to the following Contributor License Assignment:

- You represent that you have the right to submit the contribution.
- You assign to the maintainer of NOVA all right, title, and interest in and to your contribution, including copyright and related rights, to the maximum extent permitted by law.
- The maintainer may use, modify, sublicense, relicense, and distribute your contribution under the AGPL v3.0 and under separate commercial license terms.
- This CLA is required for commercial licensing, which allows the maintainer to continue operations for the long term sustainability of the project.
- If you cannot agree to these terms, do not submit the contribution.

If the maintainer requests a separate signed CLA for a contribution, that signed CLA controls in addition to this policy.
