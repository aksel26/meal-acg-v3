import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listLockersForUser } from "@/lib/facilities";

export async function GET() {
  try {
    const session = await requireAuth();
    const data = await listLockersForUser(session);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/lockers error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사물함 정보를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
