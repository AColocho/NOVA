# Infrastructure

## Shared Modules

- `backend/db_connector.py`
- `backend/storage_connector.py`
- `backend/logging_utils.py`
- `backend/nova/gpt.py`
- `backend/db_management/internal.py`
- `backend/db_management/setup.py`

## Database Rules

- Keep SQLAlchemy models typed with `Mapped[...]` and `mapped_column(...)`.
- Preserve schema separation such as `auth`, `recipe`, and `receipt`.
- Put table definitions in `backend/db_management/internal.py`.
- If persistence shape changes, update `backend/db_management/setup.py`.

## Setup Script Rules

- The setup script should:
  - ensure schemas exist
  - ensure tables exist
  - ensure required legacy columns exist
  - ensure required indexes exist
- The setup script is meant to be run manually when deploying or updating.
- Do not assume it runs automatically unless the code explicitly does so.

## Logging Rules

- Use `get_logger(__name__)`.
- For direct raise sites, use `log_raise(...)`.
- For caught exceptions, use `log_caught_exception(...)`.
- Keep client-facing error messages sanitized.

## GPT Rules

- Use `backend/nova/gpt.py` as the OpenAI wrapper.
- Keep prompts close to the domain logic that uses them.
- Validate AI output before persisting.

## Env Rules

- Keep `.env`, code, and docs synchronized.
- New required config must be reflected in:
  - `.env`
  - root `README.md`
  - relevant `.codex` domain docs

## Verification

- At minimum, run targeted syntax checks.
- Prefer narrow verification over broad slow commands.
