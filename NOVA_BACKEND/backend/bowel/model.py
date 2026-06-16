from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

BowelStatus = Literal["constipated", "normal", "loose", "urgent", "incomplete", "other"]


class BowelMovementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    occurred_on: date
    bristol_type: int = Field(ge=1, le=7)
    status: BowelStatus = "normal"
    color: str | None = Field(default=None, max_length=40)
    pain_level: int = Field(default=0, ge=0, le=10)
    blood_present: bool = False
    notes: str | None = Field(default=None, max_length=2000)


class BowelMovementUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bowel_movement_id: UUID
    occurred_on: date | None = None
    bristol_type: int | None = Field(default=None, ge=1, le=7)
    status: BowelStatus | None = None
    color: str | None = Field(default=None, max_length=40)
    pain_level: int | None = Field(default=None, ge=0, le=10)
    blood_present: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)


class BowelMovementDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bowel_movement_id: UUID


class BowelMovementMonth(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)


class BowelAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    headline: str
    overview: str
    patterns: list[str]
    suggestions: list[str]
    seek_care: list[str]
    disclaimer: str
