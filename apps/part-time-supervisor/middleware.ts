import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";

const PUBLIC_PATHS = ["/api/auth"];

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${ADMIN_APP_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
    }

    const session = await response.json();

    if (!session.authenticated || !session.user) {
      return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-user-id", session.user.id);
    requestHeaders.set("x-session-user-name", session.user.fullName);
    requestHeaders.set("x-session-user-role", session.user.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    clearTimeout(timeout);
    return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
