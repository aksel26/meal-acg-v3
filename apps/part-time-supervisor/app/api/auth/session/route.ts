import { NextResponse } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${ADMIN_APP_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
