import { NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";

export async function POST(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(
    new URL(process.env.ADMIN_APP_URL || "http://localhost:3001", request.url),
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
