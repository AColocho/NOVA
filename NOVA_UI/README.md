# NOVA UI

NOVA UI is the Next.js frontend for the NOVA household dashboard. It provides the home screen, recipes experience, receipts experience, and the current analytics placeholder.

## What It Does

Today this frontend includes:

- a home screen that launches the available apps
- recipe list, detail, create, and edit flows
- receipt list, detail, create, and edit flows
- an analytics section that is currently a placeholder

The UI is designed to stay calm, practical, and easy to scan on desktop and mobile.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- Axios
- Radix Slot
- Sonner
- Recharts

## Prerequisites

- Node.js 18+
- npm
- the sibling backend at `../NOVA_BACKEND` running locally or another reachable NOVA backend

## Environment

Create `NOVA_UI/.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

If `NEXT_PUBLIC_API_BASE_URL` is not set, the app falls back to `http://localhost:8000`.

## Local Development

Install dependencies:

```bash
cd NOVA_UI
npm install
```

Start the dev server:

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Available Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Project Structure

- `app/` route entrypoints and route-level loading states
- `components/recipes/` recipe screens and forms
- `components/receipts/` receipt screens and forms
- `components/analytics/` analytics placeholder UI
- `components/ui/` shared local primitives
- `lib/api.ts` API requests, payload shaping, and response normalization
- `lib/apps.ts` cards shown on the home screen
- `lib/recipe-form.ts` recipe form shaping helpers
- `types/index.ts` shared frontend types
- `.codex/` agent-facing repo guidance

## Working Conventions

- Keep route files in `app/` thin.
- Put feature UI in `components/<feature>/`.
- Keep API requests and response normalization in `lib/api.ts`.
- Reuse the existing UI primitives before adding new wrappers.
- Keep user-facing copy plain and non-technical.

## Backend Notes

This frontend is built against the NOVA backend in `../NOVA_BACKEND`.

Important current behavior:

- recipe and receipt API integration is implemented
- receipt scan creation can take longer than a normal request and does not return a receipt id the UI can open directly
- recipe import from URL also returns users to the recipe list instead of opening a detail screen directly
- the backend supports bearer-token authentication, but the current frontend still needs complete auth header and session wiring for full end-to-end protected flows

When frontend behavior depends on backend payloads or route behavior, inspect the matching files in `../NOVA_BACKEND/backend/` instead of guessing.

## Verification

After meaningful frontend changes, run:

```bash
npm run lint
npm run build
```

## Agent Docs

Repo-specific agent guidance lives in `NOVA_UI/.codex/`.

Start with:

- `NOVA_UI/.codex/agent.md`
- `NOVA_UI/.codex/README.md`

Then load the focused docs needed for the task.
