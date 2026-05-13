import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/project-dashboard",
  "/projects",
  "/requests",
];
const COOKIE_NAME = "acg_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/projects/:path*",
    "/project-dashboard/:path*",
    "/requests/:path*",
  ],
};
