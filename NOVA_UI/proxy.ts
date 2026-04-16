import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, buildLoginRedirect } from "@/lib/auth-shared";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/recipes") ||
    pathname.startsWith("/receipts") ||
    pathname.startsWith("/analytics")
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccessToken = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
  );

  if (pathname.startsWith("/auth")) {
    if (hasAccessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (isProtectedPath(pathname) && !hasAccessToken) {
    return NextResponse.redirect(
      new URL(buildLoginRedirect(pathname, search), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/analytics/:path*",
    "/recipes/:path*",
    "/receipts/:path*",
    "/auth/:path*",
  ],
};
