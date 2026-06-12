from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
OptionalCode = str | None


class _CodeMixin(BaseModel):
    @field_validator("password", mode="before", check_fields=False)
    @classmethod
    def _blank_password_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class RegisterHome(_CodeMixin):
    model_config = ConfigDict(extra="forbid")

    home_name: NonEmptyString = Field(max_length=120)
    login_name: NonEmptyString = Field(max_length=120)
    password: OptionalCode = None
    display_name: str | None = Field(default=None, max_length=120)


class Authenticate(_CodeMixin):
    model_config = ConfigDict(extra="forbid")

    home_name: NonEmptyString = Field(max_length=120)
    login_name: NonEmptyString = Field(max_length=120)
    password: OptionalCode = None


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: NonEmptyString


class CreateUser(_CodeMixin):
    model_config = ConfigDict(extra="forbid")

    login_name: NonEmptyString = Field(max_length=120)
    password: OptionalCode = None
    display_name: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class UpdateUser(_CodeMixin):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    login_name: NonEmptyString = Field(max_length=120)
    password: OptionalCode = None
    display_name: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class TransferAdmin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID


class UserSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    home_id: str
    home_name: str
    login_name: str
    display_name: str | None
    is_home_admin: bool
    is_active: bool


class ManagedUserSummary(UserSummary):
    password: str | None


class AuthTokens(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token_type: str
    access_token: str
    refresh_token: str
    access_token_expires_in: int
    refresh_token_expires_in: int
    user: UserSummary


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: ManagedUserSummary


class ListUsersResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[ManagedUserSummary]


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    home_id: str
    home_name: str
    login_name: str
    display_name: str | None
    is_home_admin: bool
