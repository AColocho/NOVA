import type { AuthSession, AuthUser } from "@/types";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildLoginRedirect,
} from "@/lib/auth-shared";

const COOKIE_PATH = "Path=/; SameSite=Lax";

function isBrowser() {
  return typeof document !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) {
    return;
  }

  document.cookie =
    `${name}=${encodeURIComponent(value)}; ${COOKIE_PATH}; Max-Age=${maxAgeSeconds}`;
}

function deleteCookie(name: string) {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${name}=; ${COOKIE_PATH}; Max-Age=0`;
}

function getCookie(name: string) {
  if (!isBrowser()) {
    return "";
  }

  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}

export function storeAuthSession(session: AuthSession) {
  setCookie(
    ACCESS_TOKEN_COOKIE,
    session.accessToken,
    session.accessTokenExpiresIn,
  );
  setCookie(
    REFRESH_TOKEN_COOKIE,
    session.refreshToken,
    session.refreshTokenExpiresIn,
  );
  setCookie(
    AUTH_USER_COOKIE,
    JSON.stringify(session.user),
    session.refreshTokenExpiresIn,
  );
}

export function clearAuthSession() {
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
  deleteCookie(AUTH_USER_COOKIE);
}

export function getStoredAccessToken() {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

export function getStoredRefreshToken() {
  return getCookie(REFRESH_TOKEN_COOKIE);
}

export function getStoredAuthUser(): AuthUser | null {
  const value = getCookie(AUTH_USER_COOKIE);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = buildLoginRedirect(
    window.location.pathname,
    window.location.search,
  );
}
