import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";
const SESSION_COOKIE_NAME = "request-management-session";
const USER_SESSION_COOKIE_NAME = "user-session";

const PUBLIC_PATHS = ["/api/auth", "/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const localSession = request.cookies.get(SESSION_COOKIE_NAME);
  if (localSession?.value) {
    try {
      const session = JSON.parse(localSession.value);
      if (session.userId && session.fullName && session.role) {
        return withSessionHeaders(request, {
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        });
      }
    } catch {
      // Invalid local session; continue to admin SSO fallback.
    }
  }

  const userAppSession = request.cookies.get(USER_SESSION_COOKIE_NAME);
  if (userAppSession?.value) {
    try {
      const session = JSON.parse(userAppSession.value);
      if (session.userId && session.fullName && session.role) {
        return withSessionHeaders(request, {
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        });
      }
    } catch {
      // Invalid user app session; continue to admin SSO fallback.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${ADMIN_APP_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.user) {
        return withSessionHeaders(request, {
          id: data.user.id,
          fullName: data.user.fullName,
          role: data.user.role,
        });
      }
    }
  } catch {
    clearTimeout(timeout);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

function withSessionHeaders(
  request: NextRequest,
  user: { id: string; fullName: string; role: string },
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-user-id", user.id);
  requestHeaders.set("x-session-user-name", encodeURIComponent(user.fullName));
  requestHeaders.set("x-session-user-role", user.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
