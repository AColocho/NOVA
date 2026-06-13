from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID

from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..auth.logic import AuthenticatedUser
from ..db_connector import ConnectionDB
from ..db_management.internal import Movie, MovieRating
from ..logging_utils import get_logger, log_caught_exception, log_raise
from .model import (
    MovieCreateFromTMDB,
    MovieCreateManual,
    MovieDelete,
    MovieGet,
    MovieMetadataWindow,
    MovieSetRating,
    TMDBSearch,
)
from .tmdb import TMDBClient

logger = get_logger(__name__)


class Logic(ConnectionDB):
    def __init__(self) -> None:
        super().__init__()
        self.tmdb = TMDBClient()

    @staticmethod
    def _parse_date(value: object) -> date | None:
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _decimal(value: object) -> Decimal | None:
        if value is None:
            return None
        try:
            return Decimal(str(value)).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _clean_genres(values: object) -> list[str]:
        if not isinstance(values, list):
            return []

        genres: list[str] = []
        for item in values:
            if isinstance(item, str):
                name = item.strip()
            elif isinstance(item, dict) and isinstance(item.get("name"), str):
                name = item["name"].strip()
            else:
                continue
            if name and name not in genres:
                genres.append(name)
        return genres

    @staticmethod
    def _year(movie: Movie) -> int | None:
        return movie.release_date.year if movie.release_date else None

    @staticmethod
    def _average_rating(movie: Movie) -> float | None:
        if not movie.ratings:
            return None
        return round(
            sum(rating.rating for rating in movie.ratings) / len(movie.ratings),
            2,
        )

    @staticmethod
    def _current_user_rating(movie: Movie, user_id: UUID) -> int | None:
        for rating in movie.ratings:
            if rating.user_id == user_id:
                return rating.rating
        return None

    def _image_url(self, path: str | None, *, size: str = "w500") -> str | None:
        return self.tmdb.image_url(path, size=size)

    def _serialize_summary(self, movie: Movie, user_id: UUID) -> dict[str, object]:
        overview = movie.overview or ""
        return {
            "movie_id": str(movie.id),
            "id": str(movie.id),
            "title": movie.title,
            "year": self._year(movie),
            "release_date": movie.release_date.isoformat()
            if movie.release_date
            else None,
            "poster_path": movie.poster_path,
            "poster_url": self._image_url(movie.poster_path),
            "overview": overview[:240],
            "average_rating": self._average_rating(movie),
            "current_user_rating": self._current_user_rating(movie, user_id),
            "rating_count": len(movie.ratings),
        }

    def _serialize_detail(self, movie: Movie, user_id: UUID) -> dict[str, object]:
        creator_name = None
        if movie.created_by_user is not None:
            creator_name = movie.created_by_user.display_name or movie.created_by_user.login_name

        return {
            **self._serialize_summary(movie, user_id),
            "tmdb_id": movie.tmdb_id,
            "source": movie.source,
            "original_title": movie.original_title,
            "overview": movie.overview,
            "runtime_minutes": movie.runtime_minutes,
            "backdrop_path": movie.backdrop_path,
            "backdrop_url": self._image_url(movie.backdrop_path, size="w780"),
            "tmdb_vote_average": float(movie.tmdb_vote_average)
            if movie.tmdb_vote_average is not None
            else None,
            "tmdb_vote_count": movie.tmdb_vote_count,
            "genres": movie.genres,
            "creator": {
                "user_id": str(movie.created_by_user_id)
                if movie.created_by_user_id
                else None,
                "name": creator_name,
            },
            "ratings": [
                {
                    "user_id": str(rating.user_id),
                    "user_name": rating.user.display_name or rating.user.login_name,
                    "rating": rating.rating,
                    "updated_at": rating.updated_at.isoformat(),
                }
                for rating in sorted(
                    movie.ratings,
                    key=lambda item: item.user.login_name.lower(),
                )
            ],
            "created_at": movie.created_at.isoformat(),
            "updated_at": movie.updated_at.isoformat(),
        }

    def _get_movie_for_home(self, movie_id: UUID, home_id: UUID) -> Movie:
        with self.session() as session:
            movie = session.scalar(
                select(Movie)
                .options(
                    selectinload(Movie.created_by_user),
                    selectinload(Movie.ratings).selectinload(MovieRating.user),
                )
                .where(Movie.id == movie_id, Movie.home_id == home_id)
            )
            if movie is None:
                log_raise(
                    logger,
                    "Movie not found",
                    level=30,
                    movie_id=str(movie_id),
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Movie not found.",
                )
            return movie

    def search_tmdb(
        self,
        payload: TMDBSearch,
        response: Response,
    ) -> dict[str, object]:
        data = self.tmdb.search_movies(query=payload.query, page=payload.page)
        results = data.get("results", [])
        if not isinstance(results, list):
            results = []

        response.status_code = status.HTTP_200_OK
        return {
            "page": data.get("page", payload.page),
            "total_pages": data.get("total_pages", 0),
            "total_results": data.get("total_results", 0),
            "results": [
                {
                    "tmdb_id": item.get("id"),
                    "title": item.get("title"),
                    "original_title": item.get("original_title"),
                    "overview": item.get("overview"),
                    "release_date": item.get("release_date") or None,
                    "year": self._parse_date(item.get("release_date")).year
                    if self._parse_date(item.get("release_date"))
                    else None,
                    "poster_path": item.get("poster_path"),
                    "poster_url": self._image_url(item.get("poster_path")),
                    "backdrop_path": item.get("backdrop_path"),
                    "backdrop_url": self._image_url(item.get("backdrop_path"), size="w780"),
                    "tmdb_vote_average": item.get("vote_average"),
                    "tmdb_vote_count": item.get("vote_count"),
                }
                for item in results
                if isinstance(item, dict)
            ],
        }

    def create_from_tmdb(
        self,
        payload: MovieCreateFromTMDB,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> dict[str, str]:
        details = self.tmdb.get_movie_details(tmdb_id=payload.tmdb_id)
        movie = Movie(
            home_id=home_id,
            created_by_user_id=user_id,
            tmdb_id=payload.tmdb_id,
            source="tmdb",
            title=str(details.get("title") or details.get("original_title") or "Untitled"),
            original_title=details.get("original_title")
            if isinstance(details.get("original_title"), str)
            else None,
            overview=details.get("overview") if isinstance(details.get("overview"), str) else None,
            release_date=self._parse_date(details.get("release_date")),
            runtime_minutes=details.get("runtime")
            if isinstance(details.get("runtime"), int)
            else None,
            poster_path=details.get("poster_path")
            if isinstance(details.get("poster_path"), str)
            else None,
            backdrop_path=details.get("backdrop_path")
            if isinstance(details.get("backdrop_path"), str)
            else None,
            tmdb_vote_average=self._decimal(details.get("vote_average")),
            tmdb_vote_count=details.get("vote_count")
            if isinstance(details.get("vote_count"), int)
            else None,
            genres=self._clean_genres(details.get("genres")),
        )
        if payload.initial_rating is not None:
            movie.ratings.append(MovieRating(user_id=user_id, rating=payload.initial_rating))

        try:
            with self.session() as session:
                session.add(movie)
                session.commit()
                session.refresh(movie)
        except IntegrityError as exc:
            log_caught_exception(logger, "Unable to create TMDB movie")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That TMDB movie already exists in this home.",
            ) from exc

        response.status_code = status.HTTP_201_CREATED
        return {"movie_id": str(movie.id)}

    def create_manual(
        self,
        payload: MovieCreateManual,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> dict[str, str]:
        release_date = payload.release_date
        if release_date is None and payload.year is not None:
            release_date = date(payload.year, 1, 1)

        movie = Movie(
            home_id=home_id,
            created_by_user_id=user_id,
            tmdb_id=None,
            source="manual",
            title=payload.title,
            original_title=payload.original_title,
            overview=payload.overview,
            release_date=release_date,
            runtime_minutes=payload.runtime_minutes,
            poster_path=payload.poster_path,
            backdrop_path=payload.backdrop_path,
            genres=self._clean_genres(payload.genres),
        )
        if payload.initial_rating is not None:
            movie.ratings.append(MovieRating(user_id=user_id, rating=payload.initial_rating))

        with self.session() as session:
            session.add(movie)
            session.commit()
            session.refresh(movie)

        response.status_code = status.HTTP_201_CREATED
        return {"movie_id": str(movie.id)}

    def get_metadata(
        self,
        payload: MovieMetadataWindow,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> dict[str, object]:
        with self.session() as session:
            movies = session.scalars(
                select(Movie)
                .options(selectinload(Movie.ratings))
                .where(Movie.home_id == home_id)
                .order_by(Movie.created_at.desc())
                .offset(payload.offset)
                .limit(payload.limit)
            ).all()

        response.status_code = status.HTTP_200_OK
        return {
            "offset": payload.offset,
            "limit": payload.limit,
            "count": len(movies),
            "movies": [self._serialize_summary(movie, user_id) for movie in movies],
        }

    def get_movie(
        self,
        payload: MovieGet,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> dict[str, object]:
        movie = self._get_movie_for_home(payload.movie_id, home_id)
        response.status_code = status.HTTP_200_OK
        return self._serialize_detail(movie, user_id)

    def set_rating(
        self,
        payload: MovieSetRating,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> dict[str, str]:
        with self.session() as session:
            movie = session.scalar(
                select(Movie).where(Movie.id == payload.movie_id, Movie.home_id == home_id)
            )
            if movie is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Movie not found.",
                )

            rating = session.scalar(
                select(MovieRating).where(
                    MovieRating.movie_id == payload.movie_id,
                    MovieRating.user_id == user_id,
                )
            )
            if rating is None:
                rating = MovieRating(
                    movie_id=payload.movie_id,
                    user_id=user_id,
                    rating=payload.rating,
                )
                session.add(rating)
            else:
                rating.rating = payload.rating
            session.commit()

        response.status_code = status.HTTP_200_OK
        return {"movie_id": str(payload.movie_id)}

    def delete_movie(
        self,
        payload: MovieDelete,
        response: Response,
        current_user: AuthenticatedUser,
    ) -> dict[str, str]:
        with self.session() as session:
            movie = session.scalar(
                select(Movie).where(
                    Movie.id == payload.movie_id,
                    Movie.home_id == current_user.home_id,
                )
            )
            if movie is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Movie not found.",
                )
            if (
                movie.created_by_user_id != current_user.user_id
                and not current_user.is_home_admin
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the creator or a home admin can delete this movie.",
                )

            session.delete(movie)
            session.commit()

        response.status_code = status.HTTP_200_OK
        return {"movie_id": str(payload.movie_id)}
