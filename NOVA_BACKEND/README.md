# NOVA Backend

NOVA is a small FastAPI backend for home-use data management. Right now it supports two main domains:

- `recipe`: save recipes manually or import them from a URL
- `receipt`: save receipts manually or parse them from uploaded scans

The backend now uses simple internal bearer-token authentication designed for low-friction local deployment while still supporting multiple homes and multiple users per home.

## What Exists Today

- FastAPI app mounted under `/api/v1`
- PostgreSQL via SQLAlchemy
- S3-compatible object storage for receipt scans
- OpenAI-backed parsing for recipe import and receipt scan extraction
- Home-scoped authentication with users and admins

## Authentication Model

This backend is structured as a hub:

- A `home` is the top-level tenant boundary
- Each home can have multiple users
- The first user created with `register_home` is the home admin
- Recipes and receipts are scoped by `home_id`
- Auth uses bearer tokens, not cookies

For local/internal use, auth is intentionally simple:

- Passwords are hashed with Argon2
- Access and refresh tokens are signed with a shared `JWT_SECRET`
- There is no token blacklist or logout persistence layer
- If you want to invalidate sessions, rotate `JWT_SECRET`

## Environment Variables

Fill out `.env` before running the app.

Required:

- `ENV`
- `LOG_LEVEL`
- `DB_USER`
- `DB_PASS`
- `DB_HOST`
- `DB_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ENDPOINT_URL`
- `AWS_REGION`
- `RECEIPT_BUCKET`
- `OPENAI_API_KEY`
- `JWT_SECRET`

Optional:

- `JWT_ACCESS_TTL_SECONDS`
- `JWT_REFRESH_TTL_SECONDS`

## First-Time Setup

1. Install dependencies.
2. Fill out `.env`.
3. Make sure PostgreSQL and object storage are reachable.
4. Run the database setup script:

```bash
python -m backend.db_management.setup
```

That script will:

- create missing schemas
- create missing tables
- add missing legacy columns needed for auth scoping
- add required indexes when they are missing

You mentioned the setup script is no longer run automatically on startup. That means you should run it manually after pulling schema-related changes.

## Running The App

```bash
uv run uvicorn main:app --reload
```

If you are not using `uv`, use your normal Python environment and run `uvicorn main:app --reload`.

## Auth Endpoints

All auth routes are under `/api/v1/auth`.

### Create a Home

`POST /api/v1/auth/register_home`

Creates:

- a new home
- the first user in that home
- a home-admin account
- access and refresh tokens

Example payload:

```json
{
  "home_name": "Jarvis Home",
  "email": "admin@local.home",
  "password": "supersecure123",
  "display_name": "Jarvis"
}
```

### Login

`POST /api/v1/auth/login`

```json
{
  "email": "admin@local.home",
  "password": "supersecure123"
}
```

### Refresh Tokens

`POST /api/v1/auth/refresh`

```json
{
  "refresh_token": "<refresh-token>"
}
```

### Current User

`GET /api/v1/auth/me`

Header:

```http
Authorization: Bearer <access-token>
```

### Create Another User In The Same Home

`POST /api/v1/auth/create_user`

Requires a home-admin bearer token.

```json
{
  "email": "spouse@local.home",
  "password": "anothersecure123",
  "display_name": "Taylor",
  "is_home_admin": false
}
```

### List Users In The Current Home

`GET /api/v1/auth/users`

Requires a home-admin bearer token.

## Domain Endpoints

### Recipes

Routes live under `/api/v1/recipe`.

Current operations:

- create recipe
- create recipe from URL
- get recipe metadata window
- get recipe
- update recipe
- delete recipe

### Receipts

Routes live under `/api/v1/receipt`.

Current operations:

- create receipt
- create receipt from scan
- get receipt metadata window
- get receipt
- update receipt
- delete receipt

## Code Layout

- `main.py`: app entrypoint and router mounting
- `config.py`: FastAPI app construction and middleware
- `backend/auth/`: auth routes, models, dependencies, and logic
- `backend/recipe/`: recipe routes, models, and logic
- `backend/receipt/`: receipt routes, models, and logic
- `backend/db_management/internal.py`: SQLAlchemy models
- `backend/db_management/setup.py`: schema/table/column/index setup
- `backend/nova/gpt.py`: OpenAI wrapper
- `backend/storage_connector.py`: object storage client

## Notes For Local Deployment

- This is optimized for trusted, home-network, low-friction use.
- `JWT_SECRET` should still be a strong random value.
