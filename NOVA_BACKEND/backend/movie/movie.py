"""Movie API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..auth.dependencies import get_current_user
from ..auth.logic import AuthenticatedUser
from .logic import Logic
from .model import (
    MovieCreateFromTMDB,
    MovieCreateManual,
    MovieDelete,
    MovieGet,
    MovieMetadataWindow,
    MovieSetRating,
    TMDBSearch,
)

logic = Logic()

router = APIRouter(prefix="/movie", tags=["movie"])


@router.get(path="/search_tmdb", status_code=200, summary="Search TMDB movies")
def search_tmdb(
    tmdb_search: Annotated[TMDBSearch, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Search TMDB for movie metadata."""
    _ = current_user
    return logic.search_tmdb(payload=tmdb_search, response=response)


@router.post(path="/create_from_tmdb", status_code=201, summary="Create a TMDB movie")
def create_from_tmdb(
    movie_create: MovieCreateFromTMDB,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Snapshot a TMDB movie into the current home."""
    return logic.create_from_tmdb(
        payload=movie_create,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.post(path="/create_manual", status_code=201, summary="Create a manual movie")
def create_manual(
    movie_create: MovieCreateManual,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Create a manually entered movie."""
    return logic.create_manual(
        payload=movie_create,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.get(path="/get_metadata", status_code=200, summary="Get movie metadata")
def get_metadata(
    movie_metadata_window: Annotated[MovieMetadataWindow, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a window of movie summaries."""
    return logic.get_metadata(
        payload=movie_metadata_window,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.get(path="/get_movie", status_code=200, summary="Get a movie")
def get_movie(
    movie_get: Annotated[MovieGet, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return movie metadata and household ratings."""
    return logic.get_movie(
        payload=movie_get,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.put(path="/set_rating", status_code=200, summary="Set current user rating")
def set_rating(
    movie_rating: MovieSetRating,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Create or update the current user's rating for one movie."""
    return logic.set_rating(
        payload=movie_rating,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.delete(path="/delete_movie", status_code=200, summary="Delete a movie")
def delete_movie(
    movie_delete: MovieDelete,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Delete a movie when the current user is creator or home admin."""
    return logic.delete_movie(
        payload=movie_delete,
        response=response,
        current_user=current_user,
    )
