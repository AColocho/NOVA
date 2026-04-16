# NOVA

NOVA is a two-part household dashboard for saving recipes, capturing receipts, building toward lightweight home analytics, and a home assistant.

This repository contains:

- a FastAPI backend for authentication, recipe storage, receipt storage, scan parsing, and recipe import
- a Next.js frontend for browsing, creating, and editing recipes and receipts in a clean dashboard UI

The goal is simple: keep practical household data in one calm place without turning setup into a project of its own.

## What NOVA Does Today

### Recipes

- Save recipes manually
- Import recipes from a URL
- Store ingredients, steps, prep time, cook time, and servings
- Browse, open, edit, and delete saved recipes

### Receipts

- Save receipts manually
- Upload receipt scans as PNG, JPEG, or PDF
- Parse receipt scans with OpenAI
- Store receipt totals, line items, and discounts
- Browse, open, edit, and delete saved receipts

### Authentication And Multi-Home Support

- Register a new home
- Create the first home admin during registration
- Log in with bearer tokens
- Refresh access tokens
- Add more users to the same home
- Scope recipes and receipts by `home_id`

### Frontend Dashboard

- Responsive Next.js app with dedicated Recipes and Receipts sections
- Prepared analytics area with placeholder UI for future spending summaries


## Tech Stack

- Frontend: Next.js, React, TypeScript, Axios, Tailwind CSS, Radix UI, Recharts
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Psycopg, Argon2, JWT, Boto3
- AI integrations: OpenAI for recipe import and receipt parsing
- Storage: PostgreSQL for app data, S3-compatible object storage for receipt files

## Current Status

NOVA already has real recipe and receipt CRUD flows on both the frontend and backend.

One implementation detail is still important to know before you run it: the backend protects recipe and receipt endpoints with bearer-token authentication, but the current frontend API client does not yet attach auth headers. In practice, that means:

- backend auth endpoints are implemented
- protected backend resource endpoints are implemented
- the current UI is ready for those flows, but auth wiring in the frontend is still incomplete

If you want fully working end-to-end local usage right away, plan to finish frontend auth header/session handling or temporarily relax auth requirements during development.

## Prerequisites

- Node.js 18+
- npm
- Python 3.11+
- `uv` for the backend workflow
- PostgreSQL
- An S3-compatible object store
- An OpenAI API key

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd NOVA
```

### 2. Configure the backend

Create a `.env` file inside `NOVA_BACKEND` with the variables below:

```bash
ENV=DEV
LOG_LEVEL=INFO
DB_USER=
DB_PASS=
DB_HOST=
DB_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_ENDPOINT_URL=
AWS_REGION=
RECEIPT_BUCKET=
OPENAI_API_KEY=
JWT_SECRET=
JWT_ACCESS_TTL_SECONDS=43200
JWT_REFRESH_TTL_SECONDS=2592000
```

Install dependencies and prepare the database:

```bash
cd NOVA_BACKEND
uv sync
uv run python -m backend.db_management.setup
```

Start the backend:

```bash
uv run uvicorn main:app --reload
```

The API runs on `http://localhost:8000` by default.

### 3. Configure the frontend

Create a `.env.local` file inside `NOVA_UI`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Install dependencies and start the frontend:

```bash
cd NOVA_UI
npm install
npm run dev
```

The UI runs on `http://localhost:3000` by default.

## Docker

This repository now includes:

- `NOVA_BACKEND/Dockerfile`
- `NOVA_UI/Dockerfile`
- `docker-compose.yml`
- `docker-up.sh`

The default script behavior starts:

- frontend
- backend
- Postgres
- MinIO
- a MinIO bucket init job for the configured receipt bucket

From the repo root:

```bash
chmod +x docker-up.sh
./docker-up.sh --build
```

Optional flags:

- `--no-postgres` to use an external Postgres instance
- `--no-minio` to use external S3-compatible storage
- `--run-db-setup` to run `uv run python -m backend.db_management.setup` inside the backend container after startup

The script loads `NOVA_BACKEND/.env` when present. If bundled Postgres is enabled, it forces `DB_HOST=postgres`. If bundled MinIO is enabled, it forces `AWS_ENDPOINT_URL=http://minio:9000`.

### Docker Development

For a hot-reload development stack, use:

- `NOVA_BACKEND/Dockerfile.dev`
- `NOVA_UI/Dockerfile.dev`
- `docker-compose.dev.yml`
- `docker-up-dev.sh`

From the repo root:

```bash
chmod +x docker-up-dev.sh
./docker-up-dev.sh --build
```

This dev flow:

- runs FastAPI with `uvicorn --reload`
- runs the frontend with `next dev`
- bind-mounts the backend and frontend source trees into their containers
- supports the same optional flags as the production helper script:
  - `--no-postgres`
  - `--no-minio`
  - `--run-db-setup`
  - `--build`

## Development Notes

- The backend database setup script is manual. Run `uv run python -m backend.db_management.setup` after schema-related changes.
- Receipt scan parsing depends on both object storage and a valid OpenAI API key.
- The frontend defaults to `http://localhost:8000` if `NEXT_PUBLIC_API_BASE_URL` is not set.
- There is currently no test suite checked into this repository.

## Roadmap

- Finish frontend authentication and token handling
- Ship the analytics dashboard with real spending summaries
- Add automated tests for backend logic and frontend flows
- Improve deployment ergonomics for self-hosted setups

## Additional Notes

There is also a backend-specific guide in [NOVA_BACKEND/README.md](NOVA_BACKEND/README.md) if you want narrower API and environment details while working only on the FastAPI service.

Contribution guidelines for both manual and agent-assisted work live in [contribute.md](contribute.md).
