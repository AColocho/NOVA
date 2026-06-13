const MOVIE_STATIC_SEGMENT = "_static";

function encodeId(id: string) {
  return encodeURIComponent(id);
}

export function getMovieDetailHref(id: string) {
  return `/movies/${MOVIE_STATIC_SEGMENT}?id=${encodeId(id)}`;
}

export function resolveMovieRouteId(id: string) {
  if (id !== MOVIE_STATIC_SEGMENT) {
    return id;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
}
