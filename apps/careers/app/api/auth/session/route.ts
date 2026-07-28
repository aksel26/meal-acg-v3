import { NextResponse } from "next/server";

import { AuthError, requireCareersAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireCareersAdmin();
    return NextResponse.json(
      { authenticated: true, user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401;
    return NextResponse.json(
      { authenticated: false },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
