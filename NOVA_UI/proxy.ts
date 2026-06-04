import { NextRequest, NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE, buildLoginRedirect } from "./lib/auth-shared";

const PUBLIC_PATH_PREFIXES = ["/auth", "/api"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL(buildLoginRedirect(pathname, search), request.url);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
