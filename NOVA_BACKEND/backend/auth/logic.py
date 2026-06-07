from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import os
from uuid import UUID

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..db_connector import ConnectionDB
from ..db_management.internal import Home, UserAuth


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: UUID
    home_id: UUID
    home_name: str
    login_name: str
    display_name: str | None
    is_home_admin: bool


class Logic(ConnectionDB):
    def __init__(self) -> None:
        super().__init__()
        self.jwt_secret = os.environ["JWT_SECRET"]
        self.access_ttl_seconds = int(os.environ.get("JWT_ACCESS_TTL_SECONDS", "43200"))
        self.refresh_ttl_seconds = int(
            os.environ.get("JWT_REFRESH_TTL_SECONDS", str(60 * 60 * 24 * 30))
        )

    @staticmethod
    def _normalize_name(value: str) -> str:
        return value.strip().lower()

    @staticmethod
    def _clean_code(value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return value

    @staticmethod
    def _clean_optional_name(value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return value.strip()

    @staticmethod
    def _unauthorized(detail: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    @classmethod
    def _legacy_email(cls, *, home_name: str, login_name: str) -> str:
        home_part = cls._normalize_name(home_name).replace("@", "-") or "home"
        user_part = cls._normalize_name(login_name).replace("@", "-") or "user"
        return f"{user_part}@{home_part}.local"

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
            "home_name": user.home.name,
            "login_name": user.login_name,
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
            "user": self._serialize_user(user, include_password=False),
        }

    @staticmethod
    def _serialize_user(
        user: UserAuth, *, include_password: bool = True
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "user_id": str(user.id),
            "home_id": str(user.home_id),
            "home_name": user.home.name,
            "login_name": user.login_name,
            "display_name": user.display_name,
            "is_home_admin": user.is_home_admin,
            "is_active": user.is_active,
        }
        if include_password:
            payload["password"] = user.password_plaintext
        return payload

    def register_home(
        self,
        *,
        home_name: str,
        login_name: str,
        password: str | None,
        display_name: str | None,
    ) -> dict[str, object]:
        clean_home_name = home_name.strip()
        clean_login_name = login_name.strip()
        home = Home(
            name=clean_home_name,
            name_normalized=self._normalize_name(clean_home_name),
        )
        user = UserAuth(
            home=home,
            email=self._legacy_email(
                home_name=clean_home_name, login_name=clean_login_name
            ),
            login_name=clean_login_name,
            login_name_normalized=self._normalize_name(clean_login_name),
            display_name=self._clean_optional_name(display_name),
            password_hash="",
            password_plaintext=self._clean_code(password),
            is_home_admin=True,
        )

        try:
            with self.session() as session:
                session.add_all([home, user])
                session.commit()
                session.refresh(home)
                session.refresh(user)
                user.home = home
                return self._token_response(user)
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A home with that name already exists.",
            ) from exc

    def create_user(
        self,
        *,
        current_user: AuthenticatedUser,
        login_name: str,
        password: str | None,
        display_name: str | None,
        is_active: bool,
    ) -> dict[str, object]:
        clean_login_name = login_name.strip()
        new_user = UserAuth(
            home_id=current_user.home_id,
            email=self._legacy_email(
                home_name=current_user.home_name, login_name=clean_login_name
            ),
            login_name=clean_login_name,
            login_name_normalized=self._normalize_name(clean_login_name),
            display_name=self._clean_optional_name(display_name),
            password_hash="",
            password_plaintext=self._clean_code(password),
            is_home_admin=False,
            is_active=is_active,
        )

        try:
            with self.session() as session:
                session.add(new_user)
                session.commit()
                statement = (
                    select(UserAuth)
                    .options(selectinload(UserAuth.home))
                    .where(UserAuth.id == new_user.id)
                )
                user = session.scalar(statement)
                if user is None:
                    raise RuntimeError("Created user could not be loaded.")
                return {"user": self._serialize_user(user)}
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with that name already exists in this home.",
            ) from exc

    def list_users(self, *, current_user: AuthenticatedUser) -> dict[str, object]:
        with self.session() as session:
            users = session.scalars(
                select(UserAuth)
                .options(selectinload(UserAuth.home))
                .where(UserAuth.home_id == current_user.home_id)
                .order_by(UserAuth.is_home_admin.desc(), UserAuth.login_name.asc())
            ).all()

        return {"users": [self._serialize_user(user) for user in users]}

    def update_user(
        self,
        *,
        current_user: AuthenticatedUser,
        user_id: UUID,
        login_name: str,
        password: str | None,
        display_name: str | None,
        is_active: bool,
    ) -> dict[str, object]:
        try:
            with self.session() as session:
                user = session.scalar(
                    select(UserAuth)
                    .options(selectinload(UserAuth.home))
                    .where(
                        UserAuth.id == user_id,
                        UserAuth.home_id == current_user.home_id,
                    )
                )
                if user is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found.",
                    )

                if user.id == current_user.user_id and not is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The current admin cannot deactivate themselves.",
                    )

                user.login_name = login_name.strip()
                user.login_name_normalized = self._normalize_name(login_name)
                user.display_name = self._clean_optional_name(display_name)
                user.password_plaintext = self._clean_code(password)
                user.is_active = is_active
                user.email = self._legacy_email(
                    home_name=current_user.home_name, login_name=user.login_name
                )

                session.commit()
                session.refresh(user)
                return {"user": self._serialize_user(user)}
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with that name already exists in this home.",
            ) from exc

    def transfer_admin(
        self, *, current_user: AuthenticatedUser, user_id: UUID
    ) -> dict[str, object]:
        with self.session() as session:
            new_admin = session.scalar(
                select(UserAuth)
                .options(selectinload(UserAuth.home))
                .where(UserAuth.id == user_id, UserAuth.home_id == current_user.home_id)
            )
            if new_admin is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found.",
                )
            if not new_admin.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only active users can become the home admin.",
                )

            users = session.scalars(
                select(UserAuth).where(UserAuth.home_id == current_user.home_id)
            ).all()
            for user in users:
                user.is_home_admin = False
            session.flush()
            new_admin.is_home_admin = True

            session.commit()
            session.refresh(new_admin)
            return {"user": self._serialize_user(new_admin)}

    def authenticate(
        self, *, home_name: str, login_name: str, password: str | None
    ) -> dict[str, object]:
        with self.session() as session:
            user = session.scalar(
                select(UserAuth)
                .join(Home)
                .options(selectinload(UserAuth.home))
                .where(
                    Home.name_normalized == self._normalize_name(home_name),
                    UserAuth.login_name_normalized == self._normalize_name(login_name),
                )
            )

            if user is None or not user.is_active:
                raise self._unauthorized("Invalid home, name, or code.")

            expected_code = user.password_plaintext
            provided_code = self._clean_code(password)
            if expected_code is not None and provided_code != expected_code:
                raise self._unauthorized("Invalid home, name, or code.")

            return self._token_response(user)

    def refresh_access_token(self, *, refresh_token: str) -> dict[str, object]:
        payload = self._decode_token(refresh_token, expected_type="refresh")

        with self.session() as session:
            user = session.scalar(
                select(UserAuth)
                .options(selectinload(UserAuth.home))
                .where(UserAuth.id == UUID(str(payload["sub"])))
            )

            if user is None or not user.is_active:
                raise self._unauthorized("Invalid authentication token.")

            return self._token_response(user)

    def get_current_user(self, token: str) -> AuthenticatedUser:
        payload = self._decode_token(token, expected_type="access")

        with self.session() as session:
            user = session.scalar(
                select(UserAuth)
                .options(selectinload(UserAuth.home))
                .where(UserAuth.id == UUID(str(payload["sub"])))
            )

        if user is None or not user.is_active:
            raise self._unauthorized("Invalid authentication token.")

        return AuthenticatedUser(
            user_id=user.id,
            home_id=user.home_id,
            home_name=user.home.name,
            login_name=user.login_name,
            display_name=user.display_name,
            is_home_admin=user.is_home_admin,
        )
