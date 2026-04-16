export const ACCESS_TOKEN_COOKIE = "nova_access_token";
export const REFRESH_TOKEN_COOKIE = "nova_refresh_token";
export const AUTH_USER_COOKIE = "nova_auth_user";

export function buildLoginRedirect(pathname: string, search: string) {
  const nextPath = `${pathname}${search}`;

  if (!nextPath || nextPath === "/") {
    return "/auth/login";
  }

  return `/auth/login?next=${encodeURIComponent(nextPath)}`;
}

export function getPostAuthRedirect(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
