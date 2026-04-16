# NOVA UI API Guidelines

## API Layer Rules

- Normalize API responses in `lib/api.ts`; components should consume clean frontend shapes.
- Keep request building in `lib/api.ts`, not inline in components.
- If backend field names are snake_case, translate them in the API layer.
- Shared frontend types belong in `types/index.ts`.

## Backend Coordination

- When adding a new backend-backed screen, check the sibling FastAPI route file in `../NOVA_BACKEND/backend/`.
- If a backend response shape is unclear, inspect the backend code instead of guessing from old frontend usage.
- If a backend change is required, keep the frontend docs and assumptions in sync with that change.

## Form And Mutation Behavior

- Use local component state for form editing unless there is a strong reason not to.
- Move repeated form parsing or formatting into `lib/`.
- Successful mutations should usually show a toast and then redirect to the most natural next screen.

## Verification

Run these after meaningful API-layer or screen changes:

- `npm run lint`
- `npm run build`

If `npm run build` fails in the sandbox because of Turbopack process restrictions, rerun it with escalation before assuming the code is broken.
