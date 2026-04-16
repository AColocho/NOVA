# Recipe Domain

## Files

- `backend/recipe/recipe.py`
- `backend/recipe/model.py`
- `backend/recipe/logic.py`

## Behavior

- Recipes can be created manually or imported from a URL.
- Imported recipes are parsed from webpage content through the shared GPT wrapper.
- Recipe records are scoped by `home_id`.

## Route Rules

- Routes should stay thin.
- Protected routes should require auth and pass `home_id` and `user_id` into logic where needed.

## Logic Rules

- Build recipe entities with helper methods.
- Serialize metadata and full recipe payloads explicitly.
- All read/update/delete queries must scope by `Recipe.home_id`.
- Preserve current step ordering behavior.

## Integration Rules

- Webpage fetching and parsing stay in the logic layer.
- If GPT parsing changes, keep validation strict and fail loudly on incomplete results.
