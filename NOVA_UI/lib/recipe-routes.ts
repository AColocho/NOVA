const RECIPE_STATIC_SEGMENT = "_static";

function encodeId(id: string) {
  return encodeURIComponent(id);
}

export function getRecipeDetailHref(id: string) {
  return `/recipes/${RECIPE_STATIC_SEGMENT}?id=${encodeId(id)}`;
}

export function getRecipeEditHref(id: string) {
  return `/recipes/${RECIPE_STATIC_SEGMENT}/edit?id=${encodeId(id)}`;
}

export function resolveRecipeRouteId(id: string) {
  if (id !== RECIPE_STATIC_SEGMENT) {
    return id;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
}
