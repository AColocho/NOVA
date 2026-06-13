from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TMDBSearch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: NonEmptyString
    page: int = Field(default=1, ge=1)


class MovieMetadataWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, gt=0, le=100)


class MovieGet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    movie_id: UUID


class MovieDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    movie_id: UUID


class MovieCreateFromTMDB(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tmdb_id: int = Field(gt=0)
    initial_rating: int | None = Field(default=None, ge=1, le=5)


class MovieCreateManual(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: NonEmptyString
    original_title: str | None = Field(default=None, max_length=255)
    overview: str | None = None
    release_date: date | None = None
    year: int | None = Field(default=None, ge=1800, le=3000)
    runtime_minutes: int | None = Field(default=None, ge=0)
    poster_path: str | None = Field(default=None, max_length=500)
    backdrop_path: str | None = Field(default=None, max_length=500)
    genres: list[str] = Field(default_factory=list, max_length=20)
    initial_rating: int | None = Field(default=None, ge=1, le=5)


class MovieSetRating(BaseModel):
    model_config = ConfigDict(extra="forbid")

    movie_id: UUID
    rating: int = Field(ge=1, le=5)
