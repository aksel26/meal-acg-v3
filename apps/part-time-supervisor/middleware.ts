import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";
const SESSION_COOKIE_NAME = "supervisor-session";

const PUBLIC_PATHS = ["/api/auth", "/api/contract", "/api/attendance", "/login", "/contract", "/attendance"];

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

  // 1. 자체 세션 쿠키 확인
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.userId && session.fullName && session.role) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-session-user-id", session.userId);
        requestHeaders.set(
          "x-session-user-name",
          encodeURIComponent(session.fullName)
        );
        requestHeaders.set("x-session-user-role", session.role);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch {
      // invalid cookie, fall through to SSO
    }
  }

  // 2. SSO fallback — admin 앱 세션 확인
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
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-session-user-id", data.user.id);
        requestHeaders.set(
          "x-session-user-name",
          encodeURIComponent(data.user.fullName)
        );
        requestHeaders.set("x-session-user-role", data.user.role);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }
  } catch {
    clearTimeout(timeout);
  }

  // 3. 둘 다 실패 → 로컬 로그인 페이지
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
