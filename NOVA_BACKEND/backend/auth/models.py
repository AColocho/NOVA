from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
EmailString = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=3,
        max_length=320,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]
PasswordString = Annotated[str, StringConstraints(min_length=8, max_length=200)]


class RegisterHome(BaseModel):
    model_config = ConfigDict(extra="forbid")

    home_name: NonEmptyString = Field(max_length=120)
    email: EmailString
    password: PasswordString
    display_name: str | None = Field(default=None, max_length=120)


class Authenticate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailString
    password: PasswordString


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: NonEmptyString


class CreateUser(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailString
    password: PasswordString
    display_name: str | None = Field(default=None, max_length=120)
    is_home_admin: bool = False


class UserSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    home_id: str
    email: str
    display_name: str | None
    is_home_admin: bool
    is_active: bool


class AuthTokens(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token_type: str
    access_token: str
    refresh_token: str
    access_token_expires_in: int
    refresh_token_expires_in: int
    user: UserSummary


class CreateUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserSummary


class ListUsersResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[UserSummary]


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    home_id: str
    email: str
    display_name: str | None
    is_home_admin: bool
