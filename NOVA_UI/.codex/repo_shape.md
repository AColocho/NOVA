# NOVA UI Repo Shape

## Repo Basics

- Frontend repo: `NOVA_UI`
- Sibling backend repo: `../NOVA_BACKEND`
- Frontend stack: Next.js App Router, React client components, Tailwind v4, Axios, Sonner, local UI primitives in `components/ui`
- Default frontend URL: `http://localhost:3000`
- Default API base URL: `http://localhost:8000` via `NEXT_PUBLIC_API_BASE_URL`

## Where Code Goes

- App routes live under `app/`
- Feature screens live under `components/<feature>/`
- Shared primitives live under `components/ui/`
- API calls and response normalization live in `lib/api.ts`
- Feature-specific form shaping belongs in `lib/<feature>-form.ts` when it reduces duplication
- Shared types live in `types/index.ts`

## Existing Feature Pattern

For a feature like recipes or receipts, keep this structure:

- `app/<feature>/page.tsx` for the list screen
- `app/<feature>/new/page.tsx` for create
- `app/<feature>/[id]/page.tsx` for detail
- `app/<feature>/[id]/edit/page.tsx` for edit when needed
- matching `loading.tsx` files should usually return `ScreenSkeleton`
- main screen components should live in `components/<feature>/`

Do not put page logic directly in route files unless it is trivial param plumbing.

## Current Feature Areas

- `components/recipes/` for recipe screens and forms
- `components/receipts/` for receipt screens and forms
- `components/analytics/` for the current placeholder analytics view
- `components/ui/` for shared primitives such as `Card`, `Button`, `Input`, and `Textarea`

## Safe Ways To Extend The App

- New app card: update `lib/apps.ts`
- New feature types: add them to `types/index.ts`
- New API operations: add helpers to `lib/api.ts`
- Repeated form parsing or formatting logic: move it into a focused file in `lib/`
- New UI style tokens: change `app/globals.css`, not scattered one-off values unless they are truly local
