"""Recipe API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..auth.dependencies import get_current_user
from ..auth.logic import AuthenticatedUser
from .logic import Logic
from .model import (RecipeCreate, RecipeDelete, RecipeGet,
                    RecipeImportURL, RecipeMetadataWindow, RecipeUpdate)

l = Logic()

router = APIRouter(prefix="/recipe", tags=["recipe"])


@router.post(
    path="/create_recipe",
    status_code=201,
    summary="Create a recipe",
    description=(
        "Create a new recipe with optional ingredients and ordered steps. "
        "Step numbers are assigned automatically from the order of the submitted steps."
    ),
    response_description="The created recipe identifier.",
)
def create_recipe(
    recipe_create: RecipeCreate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Persist a new recipe from the request payload."""
    return l.create_recipe(
        payload=recipe_create,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.post(
    path="/create_recipe_from_url",
    status_code=201,
    summary="Create a recipe from a URL",
    description=(
        "Fetch a recipe webpage, parse it with GPT into the recipe creation schema, "
        "store it in the database, and return the parsed recipe payload."
    ),
    response_description="The parsed recipe payload that was saved.",
    response_model=RecipeCreate,
)
def create_recipe_from_url(
    recipe_import_url: RecipeImportURL,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Fetch a URL, parse the recipe, persist it, and return the parsed payload."""
    return l.create_recipe_from_url(
        payload=recipe_import_url,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.get(
    path="/get_metadata",
    status_code=200,
    summary="Get recipe metadata window",
    description=(
        "Return a paged window of recipe metadata for UI card views. "
        "Use `offset` and `limit` query parameters to control how many recipes are returned."
    ),
    response_description="A metadata window of recipes.",
)
def get_recipe_metadata(
    recipe_metadata_window: Annotated[RecipeMetadataWindow, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a limited metadata-only recipe list for the UI."""
    return l.get_recipe_metadata(
        payload=recipe_metadata_window,
        response=response,
        home_id=current_user.home_id,
    )


@router.get(
    path="/get_recipe",
    status_code=200,
    summary="Get a full recipe",
    description=(
        "Return the full recipe payload for a single `recipe_id`, including ingredients "
        "and ordered steps."
    ),
    response_description="The full recipe record.",
)
def get_recipe(
    recipe_get: Annotated[RecipeGet, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a single full recipe by identifier."""
    return l.get_recipe(
        payload=recipe_get,
        response=response,
        home_id=current_user.home_id,
    )


@router.delete(
    path="/delete_recipe",
    status_code=200,
    summary="Delete a recipe",
    description="Delete a recipe by its `recipe_id`.",
    response_description="The deleted recipe identifier.",
)
def delete_recipe(
    recipe_delete: RecipeDelete,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Delete an existing recipe."""
    return l.delete_recipe(
        payload=recipe_delete,
        response=response,
        home_id=current_user.home_id,
    )


@router.put(
    path="/update_recipe",
    status_code=200,
    summary="Update a recipe",
    description=(
        "Update an existing recipe by `recipe_id`. Scalar fields are updated only when "
        "included in the payload. Ingredients and steps replace the current lists when provided."
    ),
    response_description="The updated recipe identifier.",
)
def update_recipe(
    recipe_update: RecipeUpdate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Apply a partial update to an existing recipe."""
    return l.update_recipe(
        payload=recipe_update,
        response=response,
        home_id=current_user.home_id,
    )
