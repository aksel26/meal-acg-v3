import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listLockerAdminOverview } from "@/lib/facilities";

export async function GET() {
  try {
    await requireAdminPermission("meal:read");
    const overview = await listLockerAdminOverview();
    return NextResponse.json(overview.requests);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("GET /api/lockers/requests error:", error);
    return NextResponse.json(
      { error: "사물함 요청 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
