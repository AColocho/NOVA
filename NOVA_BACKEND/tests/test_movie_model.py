from unittest import TestCase

from pydantic import ValidationError

from backend.db_management.internal import Movie, MovieRating
from backend.movie.model import MovieCreateManual, MovieSetRating


class MovieModelTests(TestCase):
    def test_rating_accepts_one_to_five(self) -> None:
        payload = MovieSetRating.model_validate(
            {
                "movie_id": "00000000-0000-0000-0000-000000000001",
                "rating": 5,
            }
        )

        self.assertEqual(payload.rating, 5)

    def test_rating_rejects_out_of_range_values(self) -> None:
        for rating in (0, 6):
            with self.subTest(rating=rating):
                with self.assertRaises(ValidationError):
                    MovieSetRating.model_validate(
                        {
                            "movie_id": "00000000-0000-0000-0000-000000000001",
                            "rating": rating,
                        }
                    )

    def test_manual_movie_requires_only_title(self) -> None:
        payload = MovieCreateManual.model_validate({"title": "Primer"})

        self.assertEqual(payload.title, "Primer")
        self.assertIsNone(payload.release_date)

    def test_movie_tables_define_required_constraints(self) -> None:
        movie_constraints = {constraint.name for constraint in Movie.__table__.constraints}
        rating_constraints = {
            constraint.name for constraint in MovieRating.__table__.constraints
        }

        self.assertIn("uq_movies_home_tmdb_id", movie_constraints)
        self.assertIn("ck_movies_source_tmdb_id", movie_constraints)
        self.assertIn("uq_movie_ratings_movie_user", rating_constraints)
        self.assertIn("ck_movie_ratings_rating", rating_constraints)
