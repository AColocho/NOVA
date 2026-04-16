from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import os
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..db_connector import ConnectionDB
from ..db_management.internal import Home, UserAuth


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: UUID
    home_id: UUID
    email: str
    display_name: str | None
    is_home_admin: bool


class Logic(ConnectionDB):
    def __init__(self) -> None:
        super().__init__()
        self.password_hasher = PasswordHasher()
        self.jwt_secret = os.environ["JWT_SECRET"]
        self.access_ttl_seconds = int(os.environ.get("JWT_ACCESS_TTL_SECONDS", "43200"))
        self.refresh_ttl_seconds = int(
            os.environ.get("JWT_REFRESH_TTL_SECONDS", str(60 * 60 * 24 * 30))
        )

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _unauthorized(detail: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    def hash_password(self, password: str) -> str:
        return self.password_hasher.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            return self.password_hasher.verify(password_hash, password)
        except (VerifyMismatchError, InvalidHashError):
            return False

    def _encode_token(
        self,
        *,
        user: UserAuth,
        token_type: str,
        ttl_seconds: int,
    ) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "home_id": str(user.home_id),
            "email": user.email,
            "display_name": user.display_name,
            "is_home_admin": user.is_home_admin,
            "token_type": token_type,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=ttl_seconds)).timestamp()),
        }
        return jwt.encode(payload=payload, key=self.jwt_secret, algorithm="HS256")

    def _decode_token(self, token: str, *, expected_type: str) -> dict[str, object]:
        try:
            payload = jwt.decode(token, key=self.jwt_secret, algorithms=["HS256"])
        except jwt.PyJWTError as exc:
            raise self._unauthorized("Invalid authentication token.") from exc

        if payload.get("token_type") != expected_type:
            raise self._unauthorized("Invalid authentication token.")

        return payload

    def _token_response(self, user: UserAuth) -> dict[str, object]:
        return {
            "token_type": "bearer",
            "access_token": self._encode_token(
                user=user,
                token_type="access",
                ttl_seconds=self.access_ttl_seconds,
            ),
            "refresh_token": self._encode_token(
                user=user,
                token_type="refresh",
                ttl_seconds=self.refresh_ttl_seconds,
            ),
            "access_token_expires_in": self.access_ttl_seconds,
            "refresh_token_expires_in": self.refresh_ttl_seconds,
            "user": self._serialize_user(user),
        }

    @staticmethod
    def _serialize_user(user: UserAuth) -> dict[str, object]:
        return {
            "user_id": str(user.id),
            "home_id": str(user.home_id),
            "email": user.email,
            "display_name": user.display_name,
            "is_home_admin": user.is_home_admin,
            "is_active": user.is_active,
        }

    def register_home(
        self,
        *,
        home_name: str,
        email: str,
        password: str,
        display_name: str | None,
    ) -> dict[str, object]:
        normalized_email = self._normalize_email(email)
        home = Home(name=home_name.strip())
        user = UserAuth(
            home=home,
            email=normalized_email,
            display_name=display_name.strip() if display_name else None,
            password_hash=self.hash_password(password),
            is_home_admin=True,
        )

        try:
            with self.session() as session:
                session.add_all([home, user])
                session.commit()
                session.refresh(user)
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with that email already exists.",
            ) from exc

        return self._token_response(user)

    def create_user(
        self,
        *,
        current_user: AuthenticatedUser,
        email: str,
        password: str,
        display_name: str | None,
        is_home_admin: bool,
    ) -> dict[str, object]:
        if not current_user.is_home_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only home admins can create users.",
            )

        normalized_email = self._normalize_email(email)
        new_user = UserAuth(
            home_id=current_user.home_id,
            email=normalized_email,
            display_name=display_name.strip() if display_name else None,
            password_hash=self.hash_password(password),
            is_home_admin=is_home_admin,
        )

        try:
            with self.session() as session:
                session.add(new_user)
                session.commit()
                session.refresh(new_user)
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with that email already exists.",
            ) from exc

        return {"user": self._serialize_user(new_user)}

    def list_users(self, *, current_user: AuthenticatedUser) -> dict[str, object]:
        if not current_user.is_home_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only home admins can view users.",
            )

        with self.session() as session:
            users = session.scalars(
                select(UserAuth)
                .where(UserAuth.home_id == current_user.home_id)
                .order_by(UserAuth.created_at.asc(), UserAuth.email.asc())
            ).all()

        return {"users": [self._serialize_user(user) for user in users]}

    def authenticate(self, *, email: str, password: str) -> dict[str, object]:
        normalized_email = self._normalize_email(email)

        with self.session() as session:
            user = session.scalar(select(UserAuth).where(UserAuth.email == normalized_email))

        if user is None or not user.is_active or not self.verify_password(
            password, user.password_hash
        ):
            raise self._unauthorized("Invalid email or password.")

        return self._token_response(user)

    def refresh_access_token(self, *, refresh_token: str) -> dict[str, object]:
        payload = self._decode_token(refresh_token, expected_type="refresh")

        with self.session() as session:
            user = session.get(UserAuth, UUID(str(payload["sub"])))

        if user is None or not user.is_active:
            raise self._unauthorized("Invalid authentication token.")

        return self._token_response(user)

    def get_current_user(self, token: str) -> AuthenticatedUser:
        payload = self._decode_token(token, expected_type="access")

        with self.session() as session:
            user = session.get(UserAuth, UUID(str(payload["sub"])))

        if user is None or not user.is_active:
            raise self._unauthorized("Invalid authentication token.")

        return AuthenticatedUser(
            user_id=user.id,
            home_id=user.home_id,
            email=user.email,
            display_name=user.display_name,
            is_home_admin=user.is_home_admin,
        )
