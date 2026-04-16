from html.parser import HTMLParser
import logging
from urllib import error, request
from uuid import UUID

from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..db_connector import ConnectionDB
from ..db_management.internal import Ingredient, Recipe, Step
from ..logging_utils import get_logger, log_caught_exception, log_raise
from ..nova.gpt import GPTClient
from .model import (RecipeCreate, RecipeDelete, RecipeGet,
                    RecipeImportURL, RecipeMetadataWindow, RecipeUpdate)

logger = get_logger(__name__)


class _PageTextExtractor(HTMLParser):
    """Extract visible text and JSON-LD blobs from an HTML document."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._ignored_tag_stack: list[str] = []
        self._script_is_json_ld = False
        self._text_chunks: list[str] = []
        self._json_ld_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self._ignored_tag_stack.append(tag)
            attributes = dict(attrs)
            self._script_is_json_ld = (
                tag == "script"
                and attributes.get("type", "").lower() == "application/ld+json"
            )
            return

        if tag in {"br", "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self._text_chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._ignored_tag_stack and self._ignored_tag_stack[-1] == tag:
            self._ignored_tag_stack.pop()
            if tag == "script":
                self._script_is_json_ld = False
            return

        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self._text_chunks.append("\n")

    def handle_data(self, data: str) -> None:
        content = data.strip()
        if not content:
            return

        if self._ignored_tag_stack:
            if self._script_is_json_ld:
                self._json_ld_chunks.append(content)
            return

        self._text_chunks.append(content)

    def visible_text(self) -> str:
        lines = (" ".join(chunk.split()) for chunk in "".join(self._text_chunks).splitlines())
        return "\n".join(line for line in lines if line)

    def json_ld_text(self) -> str:
        return "\n".join(chunk for chunk in self._json_ld_chunks if chunk)


class Logic(ConnectionDB):
    @staticmethod
    def _build_recipe(payload: RecipeCreate, home_id: UUID, user_id: UUID) -> Recipe:
        """Build a SQLAlchemy recipe entity from the validated create payload."""
        recipe = Recipe(
            home_id=home_id,
            created_by_user_id=user_id,
            name=payload.name,
            description=payload.description,
            prep_time=payload.prep_time,
            cook_time=payload.cook_time,
            servings=payload.servings,
        )

        recipe.ingredients.extend(
            Ingredient(
                name=ingredient.name,
                amount=ingredient.amount,
                unit=ingredient.unit,
            )
            for ingredient in payload.ingredients
        )
        recipe.steps.extend(
            Step(instruction=step.instruction) for step in payload.steps
        )
        return recipe

    def _save_recipe(self, payload: RecipeCreate, home_id: UUID, user_id: UUID) -> Recipe:
        """Persist a recipe payload and return the created record."""
        recipe = self._build_recipe(payload, home_id=home_id, user_id=user_id)

        try:
            with self.session() as session:
                session.add(recipe)
                session.commit()
                session.refresh(recipe)
        except IntegrityError as exc:
            log_caught_exception(logger, "Unable to create recipe record")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create recipe with the provided data.",
            ) from exc

        return recipe

    @staticmethod
    def _fetch_webpage(url: str) -> str:
        """Fetch a webpage as text for GPT parsing."""
        webpage_request = request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; NOVA Recipe Importer/1.0; "
                    "+https://nova.local)"
                )
            },
        )

        try:
            with request.urlopen(webpage_request, timeout=20) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    log_raise(
                        logger,
                        "Recipe import URL returned non-HTML content",
                        url=url,
                        level=logging.WARNING,
                        content_type=content_type,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The provided URL did not return an HTML page.",
                    )

                return response.read(1_500_000).decode(charset, errors="replace")
        except error.HTTPError as exc:
            log_caught_exception(
                logger,
                "HTTP error while fetching recipe URL",
                url=url,
                status=exc.code,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to fetch the provided URL. Remote server returned {exc.code}.",
            ) from exc
        except error.URLError as exc:
            log_caught_exception(logger, "URL error while fetching recipe URL", url=url)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to fetch the provided URL.",
            ) from exc

    @staticmethod
    def _extract_recipe_page_content(html: str) -> str:
        """Extract the most useful textual parts of a recipe page for GPT."""
        parser = _PageTextExtractor()
        parser.feed(html)

        visible_text = parser.visible_text()
        json_ld_text = parser.json_ld_text()

        parts: list[str] = []
        if json_ld_text:
            parts.append(f"JSON-LD from the page:\n{json_ld_text[:12000]}")
        if visible_text:
            parts.append(f"Visible page text:\n{visible_text[:20000]}")

        page_content = "\n\n".join(parts).strip()
        if not page_content:
            log_raise(
                logger,
                "Recipe page content extraction produced no readable text",
                level=logging.WARNING,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The provided page did not contain readable recipe content.",
            )

        return page_content

    @staticmethod
    def _serialize_recipe_metadata(recipe: Recipe) -> dict[str, str | int | None]:
        """Return the subset of recipe fields used for card-style UI displays."""
        return {
            "recipe_id": str(recipe.id),
            "name": recipe.name,
            "description": recipe.description,
            "prep_time": recipe.prep_time,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
        }

    @staticmethod
    def _serialize_recipe(recipe: Recipe) -> dict[str, object]:
        """Return a full recipe payload including ingredients and ordered steps."""
        return {
            "recipe_id": str(recipe.id),
            "name": recipe.name,
            "description": recipe.description,
            "prep_time": recipe.prep_time,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "created_at": recipe.created_at.isoformat(),
            "updated_at": recipe.updated_at.isoformat(),
            "ingredients": [
                {
                    "ingredient_id": str(ingredient.id),
                    "name": ingredient.name,
                    "amount": ingredient.amount,
                    "unit": ingredient.unit,
                }
                for ingredient in recipe.ingredients
            ],
            "steps": [
                {
                    "step_id": str(step.id),
                    "step_number": step.step_number,
                    "instruction": step.instruction,
                }
                for step in recipe.steps
            ],
        }

    def create_recipe(
        self, payload: RecipeCreate, response: Response, home_id: UUID, user_id: UUID
    ) -> dict[str, str]:
        """Create a recipe and all nested ingredients and steps."""
        recipe = self._save_recipe(payload, home_id=home_id, user_id=user_id)

        response.status_code = status.HTTP_201_CREATED
        return {"recipe_id": str(recipe.id)}

    def create_recipe_from_url(
        self,
        payload: RecipeImportURL,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> RecipeCreate:
        """Fetch, parse, and persist a recipe from a webpage URL."""
        html = self._fetch_webpage(str(payload.url))
        page_content = self._extract_recipe_page_content(html)

        parsed_recipe = GPTClient().chat(
            prompt=(
                f"Extract a recipe from this webpage.\n\n"
                f"Source URL: {payload.url}\n\n"
                f"{page_content}"
            ),
            system_prompt=(
                "Extract exactly one recipe from the provided webpage content. "
                "Return data that matches the recipe creation schema. "
                "Do not invent missing details. Use null for unknown description, prep_time, "
                "cook_time, and servings. Keep ingredient amount and unit optional. "
                "Return ordered steps. If the page does not contain a usable recipe, fail."
            ),
            response_model=RecipeCreate,
            temperature=0,
        )
        if not isinstance(parsed_recipe, RecipeCreate):
            log_raise(
                logger,
                "Recipe parser returned unexpected payload type",
                url=str(payload.url),
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The recipe parser did not return the expected payload.",
            )
        if not parsed_recipe.ingredients or not parsed_recipe.steps:
            log_raise(
                logger,
                "Recipe parser returned incomplete payload",
                level=logging.WARNING,
                url=str(payload.url),
                ingredient_count=len(parsed_recipe.ingredients),
                step_count=len(parsed_recipe.steps),
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract a complete recipe from the provided URL.",
            )

        self._save_recipe(parsed_recipe, home_id=home_id, user_id=user_id)
        response.status_code = status.HTTP_201_CREATED
        return parsed_recipe

    def get_recipe_metadata(
        self,
        payload: RecipeMetadataWindow,
        response: Response,
        home_id: UUID,
    ) -> dict[str, int | list[dict[str, str | int | None]]]:
        """Return a window of recipe metadata for list or card views."""
        with self.session() as session:
            statement = (
                select(Recipe)
                .where(Recipe.home_id == home_id)
                .order_by(Recipe.created_at.desc())
                .offset(payload.offset)
                .limit(payload.limit)
            )
            recipes = session.scalars(statement).all()

        response.status_code = status.HTTP_200_OK
        return {
            "offset": payload.offset,
            "limit": payload.limit,
            "count": len(recipes),
            "recipes": [self._serialize_recipe_metadata(recipe) for recipe in recipes],
        }

    def get_recipe(
        self, payload: RecipeGet, response: Response, home_id: UUID
    ) -> dict[str, object]:
        """Return the full recipe record for a single recipe identifier."""
        with self.session() as session:
            statement = (
                select(Recipe)
                .options(
                    selectinload(Recipe.ingredients),
                    selectinload(Recipe.steps),
                )
                .where(Recipe.id == payload.recipe_id, Recipe.home_id == home_id)
            )
            recipe = session.scalar(statement)
            if recipe is None:
                log_raise(
                    logger,
                    "Recipe not found",
                    level=logging.WARNING,
                    recipe_id=str(payload.recipe_id),
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipe not found.",
                )

        response.status_code = status.HTTP_200_OK
        return self._serialize_recipe(recipe)

    def delete_recipe(
        self, payload: RecipeDelete, response: Response, home_id: UUID
    ) -> dict[str, str]:
        """Delete a recipe by identifier."""
        with self.session() as session:
            recipe = session.scalar(
                select(Recipe).where(
                    Recipe.id == payload.recipe_id,
                    Recipe.home_id == home_id,
                )
            )
            if recipe is None:
                log_raise(
                    logger,
                    "Recipe not found for delete",
                    level=logging.WARNING,
                    recipe_id=str(payload.recipe_id),
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipe not found.",
                )

            session.delete(recipe)
            session.commit()

        response.status_code = status.HTTP_200_OK
        return {"recipe_id": str(payload.recipe_id)}

    def update_recipe(
        self, payload: RecipeUpdate, response: Response, home_id: UUID
    ) -> dict[str, str]:
        """Apply a partial update to a recipe and optionally replace nested lists."""
        try:
            with self.session() as session:
                recipe = session.scalar(
                    select(Recipe).where(
                        Recipe.id == payload.recipe_id,
                        Recipe.home_id == home_id,
                    )
                )
                if recipe is None:
                    log_raise(
                        logger,
                        "Recipe not found for update",
                        level=logging.WARNING,
                        recipe_id=str(payload.recipe_id),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Recipe not found.",
                    )

                if "name" in payload.model_fields_set and payload.name is not None:
                    recipe.name = payload.name
                if "description" in payload.model_fields_set:
                    recipe.description = payload.description
                if "prep_time" in payload.model_fields_set:
                    recipe.prep_time = payload.prep_time
                if "cook_time" in payload.model_fields_set:
                    recipe.cook_time = payload.cook_time
                if "servings" in payload.model_fields_set:
                    recipe.servings = payload.servings
                if (
                    "ingredients" in payload.model_fields_set
                    and payload.ingredients is not None
                ):
                    recipe.ingredients[:] = [
                        Ingredient(
                            name=ingredient.name,
                            amount=ingredient.amount,
                            unit=ingredient.unit,
                        )
                        for ingredient in payload.ingredients
                    ]
                if "steps" in payload.model_fields_set and payload.steps is not None:
                    recipe.steps[:] = [
                        Step(instruction=step.instruction) for step in payload.steps
                    ]

                session.commit()
                session.refresh(recipe)
        except IntegrityError as exc:
            log_caught_exception(
                logger,
                "Unable to update recipe record",
                recipe_id=str(payload.recipe_id),
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to update recipe with the provided data.",
            ) from exc

        response.status_code = status.HTTP_200_OK
        return {"recipe_id": str(payload.recipe_id)}
