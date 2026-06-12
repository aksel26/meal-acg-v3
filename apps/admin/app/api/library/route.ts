import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listLibraryAdminOverview } from "@/lib/library";

export async function GET() {
  try {
    await requireAdminPermission("library:read");
    return NextResponse.json(await listLibraryAdminOverview());
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    console.error("GET /api/library error:", error);
    return NextResponse.json(
      { error: "도서관 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
