from typing import Annotated

from fastapi import APIRouter, Depends, status

from .dependencies import get_current_home_admin, get_current_user
from .logic import AuthenticatedUser, Logic
from .models import (Authenticate, AuthTokens, CreateUser, CreateUserResponse,
                     ListUsersResponse, MeResponse, RefreshTokenRequest,
                     RegisterHome)

router = APIRouter(prefix="/auth", tags=["auth"])
logic = Logic()


@router.post(
    "/register_home",
    status_code=status.HTTP_201_CREATED,
    summary="Register a home",
    description=(
        "Create a new home, create its initial admin user, and return a fresh "
        "access/refresh token pair for that admin."
    ),
    response_description="The created admin user and its auth tokens.",
    response_model=AuthTokens,
)
@router.post(
    "/create_home",
    include_in_schema=False,
    status_code=status.HTTP_201_CREATED,
    response_model=AuthTokens,
)
def register_home(payload: RegisterHome):
    """Create a home and bootstrap its first admin account."""
    return logic.register_home(
        home_name=payload.home_name,
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
    )


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    summary="Log in",
    description="Authenticate a user with email and password and return auth tokens.",
    response_description="A fresh access/refresh token pair for the user.",
    response_model=AuthTokens,
)
def login(payload: Authenticate):
    """Authenticate an existing user and return bearer tokens."""
    return logic.authenticate(email=payload.email, password=payload.password)


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    summary="Refresh tokens",
    description=(
        "Exchange a valid refresh token for a new access/refresh token pair."
    ),
    response_description="A rotated access/refresh token pair for the same user.",
    response_model=AuthTokens,
)
def refresh(payload: RefreshTokenRequest):
    """Rotate auth tokens from a valid refresh token."""
    return logic.refresh_access_token(refresh_token=payload.refresh_token)


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Return the authenticated user represented by the bearer token.",
    response_description="The current authenticated user.",
    response_model=MeResponse,
)
def get_me(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return the user identified by the current bearer token."""
    return {
        "user_id": str(current_user.user_id),
        "home_id": str(current_user.home_id),
        "email": current_user.email,
        "display_name": current_user.display_name,
        "is_home_admin": current_user.is_home_admin,
    }


@router.post(
    "/create_user",
    status_code=status.HTTP_201_CREATED,
    summary="Create a user in the current home",
    description=(
        "Create another user inside the authenticated admin's home."
    ),
    response_description="The created user record.",
    response_model=CreateUserResponse,
)
def create_user(
    payload: CreateUser,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_home_admin)],
):
    """Create a user in the current home for an authenticated admin."""
    return logic.create_user(
        current_user=current_user,
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
        is_home_admin=payload.is_home_admin,
    )


@router.get(
    "/users",
    status_code=status.HTTP_200_OK,
    summary="List users in the current home",
    description=(
        "Return the users that belong to the authenticated admin's home."
    ),
    response_description="The users in the current home.",
    response_model=ListUsersResponse,
)
def list_users(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_home_admin)],
):
    """List the users for the authenticated admin's home."""
    return logic.list_users(current_user=current_user)
