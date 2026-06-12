import json
import os
from urllib import error, parse, request

from fastapi import HTTPException, status


class TMDBClient:
    base_url = "https://api.themoviedb.org/3"

    def __init__(self) -> None:
        self.access_token = os.environ.get("TMDB_ACCESS_TOKEN", "").strip()
        self.api_key = os.environ.get("TMDB_API_KEY", "").strip()
        self.image_base_url = os.environ.get(
            "TMDB_IMAGE_BASE_URL", "https://image.tmdb.org/t/p"
        ).rstrip("/")

    def _build_url(self, path: str, params: dict[str, object]) -> str:
        clean_params = {
            key: value
            for key, value in params.items()
            if value is not None and str(value).strip()
        }
        if not self.access_token:
            if not self.api_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="TMDB credentials are not configured.",
                )
            clean_params["api_key"] = self.api_key

        return f"{self.base_url}{path}?{parse.urlencode(clean_params)}"

    def _request_json(self, path: str, params: dict[str, object]) -> dict[str, object]:
        headers = {
            "Accept": "application/json",
            "User-Agent": "NOVA Movies/1.0",
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        tmdb_request = request.Request(
            self._build_url(path, params),
            headers=headers,
        )

        try:
            with request.urlopen(tmdb_request, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = "TMDB request failed."
            try:
                body = json.loads(exc.read().decode("utf-8"))
                if isinstance(body, dict) and isinstance(body.get("status_message"), str):
                    detail = body["status_message"]
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
            raise HTTPException(status_code=exc.code, detail=detail) from exc
        except error.URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach TMDB.",
            ) from exc

    def search_movies(self, *, query: str, page: int = 1) -> dict[str, object]:
        return self._request_json(
            "/search/movie",
            {
                "query": query,
                "page": page,
                "include_adult": "false",
            },
        )

    def get_movie_details(self, *, tmdb_id: int) -> dict[str, object]:
        return self._request_json(f"/movie/{tmdb_id}", {})

    def image_url(self, path: str | None, *, size: str = "w500") -> str | None:
        if not path:
            return None
        if path.startswith("http://") or path.startswith("https://"):
            return path
        return f"{self.image_base_url}/{size}{path}"
