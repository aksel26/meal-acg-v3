import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decodeSessionCookie } from "@/lib/session-cookie";

const SESSION_COOKIE_NAME = "careers-session";
const PUBLIC_PATHS = ["/api/auth/sso/callback", "/auth/error"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie && (await decodeSessionCookie(cookie))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.redirect(
    new URL(
      "/api/auth/sso/careers",
      process.env.ADMIN_APP_URL || "http://localhost:3001",
    ),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
