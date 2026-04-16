# Auth Domain

## Files

- `backend/auth/auth.py`
- `backend/auth/logic.py`
- `backend/auth/models.py`
- `backend/auth/dependencies.py`
- `backend/db_management/internal.py`

## Auth Model

- Authentication is internal-use and intentionally simple.
- Passwords are hashed with Argon2.
- Tokens are bearer tokens signed with `JWT_SECRET` using `HS256`.
- There are two token types:
  - access
  - refresh
- Access and refresh TTLs are controlled by:
  - `JWT_ACCESS_TTL_SECONDS`
  - `JWT_REFRESH_TTL_SECONDS`

## Multi-Home Structure

- `Home` is the tenant boundary.
- `UserAuth` belongs to a single `home_id`.
- The first user created through `register_home` is the home admin.
- Additional users are created inside the current authenticated home.
- Recipes and receipts are scoped by `home_id`.

## Current Auth Flow

1. `POST /api/v1/auth/register_home`
   - creates a new home
   - creates the initial admin user
   - returns access and refresh tokens
2. `POST /api/v1/auth/login`
   - verifies email and password
   - returns access and refresh tokens
3. `POST /api/v1/auth/refresh`
   - accepts a refresh token
   - returns a new token pair
4. `GET /api/v1/auth/me`
   - returns the current user
5. `POST /api/v1/auth/create_user`
   - admin-only
   - creates another user in the same home
6. `GET /api/v1/auth/users`
   - admin-only
   - lists users in the same home

## Dependency Rules

- Protected routes use `get_current_user` from `backend/auth/dependencies.py`.
- The dependency expects `Authorization: Bearer <access-token>`.
- The decoded principal includes:
  - `user_id`
  - `home_id`
  - `email`
  - `display_name`
  - `is_home_admin`

## Editing Rules

- If auth claims change, update both token encoding and decoding assumptions.
- If home scoping changes, update recipe and receipt queries as well.
- Keep auth responses simple and explicit.
- This repo currently does not implement persistent logout or token revocation.
