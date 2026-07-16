import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSessionCookie } from "@/lib/session-cookie";

const SESSION_COOKIE_NAME = "supervisor-session";

const PUBLIC_PATHS = [
  "/api/auth",
  "/api/contract/",
  "/api/attendance",
  "/login",
  "/contract",
  "/attendance",
];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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

  function authorizedResponse(user: {
    id: string;
    fullName: string;
    role: string;
    canEdit: boolean;
  }) {
    if (
      pathname.startsWith("/api/") &&
      !SAFE_METHODS.has(request.method) &&
      !user.canEdit
    ) {
      return NextResponse.json(
        { error: "편집 권한이 없습니다." },
        { status: 403 },
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-user-id", user.id);
    requestHeaders.set(
      "x-session-user-name",
      encodeURIComponent(user.fullName),
    );
    requestHeaders.set("x-session-user-role", user.role);
    requestHeaders.set("x-session-user-can-edit", String(user.canEdit));
    requestHeaders.set("x-session-request-method", request.method);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 1. 자체 세션 — API 라우트의 requireAuth가 DB 권한을 다시 검증함
  const localCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (localCookie) {
    const session = await decodeSessionCookie(localCookie);
    if (session) {
      return authorizedResponse({
        id: session.userId,
        fullName: session.fullName,
        role: session.role,
        canEdit: session.canEdit,
      });
    }
  }

  // 2. 세션 없음 → 로컬 로그인 페이지. 앱 간 SSO는 1회용 코드로 세션을 발급함.
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
