# Architecture

## Purpose

- This repo is a small FastAPI backend with domain modules under `backend/`.
- Current product domains are `auth`, `recipe`, and `receipt`.
- The codebase favors thin route handlers, strict Pydantic schemas, and business logic collected in `Logic` classes.

## File Ownership

- Keep HTTP routes in `backend/<domain>/<domain>.py`.
- Keep request and response schemas in `backend/<domain>/model.py` or `models.py`.
- Keep business logic and persistence orchestration in `backend/<domain>/logic.py`.
- Keep shared helpers at the `backend/` root when they are truly cross-domain.
- Keep SQLAlchemy models and relationships in `backend/db_management/internal.py`.
- Keep database setup and schema reconciliation in `backend/db_management/setup.py`.
- Keep app bootstrapping in `config.py` and `main.py`.

## Route Conventions

- Routes should be thin wrappers around logic-layer methods.
- Instantiate the logic class once at module scope when that pattern already exists.
- Use `APIRouter(prefix="/<domain>", tags=["<domain>"])`.
- Mount routers through `main.py` under `/api/v1`.
- Include FastAPI metadata on routes:
  - `status_code`
  - `summary`
  - `description`
  - `response_description`
  - `response_model` when useful

## Model Conventions

- Use `ConfigDict(extra="forbid")` by default.
- Keep separate models for create, update, get, delete, and pagination/window inputs.
- Keep money as `Decimal`.
- Keep IDs as `UUID`.
- Use validators only where they cleanly normalize noisy inputs.

## Logic Conventions

- `Logic` classes may inherit from `ConnectionDB`.
- Build ORM entities in focused helpers.
- Keep serialization explicit.
- Do not return raw ORM objects from the API layer.
- Keep transactions narrow.

## Change Discipline

- Match existing patterns before adding new abstractions.
- Avoid broad refactors unless asked.
- Keep env vars, docs, and setup logic synchronized with code changes.
