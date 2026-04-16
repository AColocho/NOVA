from typing import Annotated
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, StringConstraints

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class IngredientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: NonEmptyString
    amount: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=50)


class StepCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instruction: NonEmptyString


class RecipeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: NonEmptyString
    description: str | None = None
    prep_time: int | None = Field(default=None, ge=0)
    cook_time: int | None = Field(default=None, ge=0)
    servings: int | None = Field(default=None, gt=0)
    ingredients: list[IngredientCreate] = Field(default_factory=list)
    steps: list[StepCreate] = Field(default_factory=list)


class RecipeDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: UUID


class IngredientUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: NonEmptyString
    amount: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=50)


class StepUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instruction: NonEmptyString


class RecipeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: UUID
    name: NonEmptyString | None = None
    description: str | None = None
    prep_time: int | None = Field(default=None, ge=0)
    cook_time: int | None = Field(default=None, ge=0)
    servings: int | None = Field(default=None, gt=0)
    ingredients: list[IngredientUpdate] | None = None
    steps: list[StepUpdate] | None = None


class RecipeMetadataWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, gt=0, le=100)


class RecipeGet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_id: UUID


class RecipeImportURL(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: AnyHttpUrl
