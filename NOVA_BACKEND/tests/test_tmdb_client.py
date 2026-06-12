import json
from unittest import TestCase
from unittest.mock import patch

from backend.movie.tmdb import TMDBClient


class _FakeResponse:
    headers = {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self) -> bytes:
        return json.dumps({"results": []}).encode("utf-8")


class TMDBClientTests(TestCase):
    def test_uses_bearer_token_when_present(self) -> None:
        requests = []

        def fake_urlopen(tmdb_request, timeout):
            requests.append(tmdb_request)
            self.assertEqual(timeout, 20)
            return _FakeResponse()

        with patch.dict(
            "os.environ",
            {
                "TMDB_ACCESS_TOKEN": "token-value",
                "TMDB_API_KEY": "key-value",
            },
            clear=False,
        ), patch("backend.movie.tmdb.request.urlopen", side_effect=fake_urlopen):
            TMDBClient().search_movies(query="Alien")

        self.assertEqual(requests[0].get_header("Authorization"), "Bearer token-value")
        self.assertNotIn("api_key=", requests[0].full_url)

    def test_uses_api_key_fallback_without_bearer_token(self) -> None:
        requests = []

        def fake_urlopen(tmdb_request, timeout):
            requests.append(tmdb_request)
            self.assertEqual(timeout, 20)
            return _FakeResponse()

        with patch.dict(
            "os.environ",
            {
                "TMDB_ACCESS_TOKEN": "",
                "TMDB_API_KEY": "key-value",
            },
            clear=False,
        ), patch("backend.movie.tmdb.request.urlopen", side_effect=fake_urlopen):
            TMDBClient().search_movies(query="Alien")

        self.assertIsNone(requests[0].get_header("Authorization"))
        self.assertIn("api_key=key-value", requests[0].full_url)
