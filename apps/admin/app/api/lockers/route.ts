import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listLockerAdminOverview } from "@/lib/facilities";
import { createServiceClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  const status = normalizeText(value) || "available";
  if (status === "available" || status === "assigned" || status === "disabled") {
    return status;
  }
  throw new Error("사물함 상태를 확인해주세요.");
}

export async function GET() {
  try {
    await requireAdminPermission("locker:read");
    return NextResponse.json(await listLockerAdminOverview());
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("GET /api/lockers error:", error);
    return NextResponse.json(
      { error: "사물함 관리 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminPermission("locker:write");
    const body = await request.json();
    const code = normalizeText(body.code);
    const locationZone = normalizeText(body.locationZone);
    const locationDetail = normalizeText(body.locationDetail);

    if (!code || !locationZone || !locationDetail) {
      return NextResponse.json(
        { error: "사물함 번호, 구역, 위치를 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("lockers")
      .insert({
        code,
        location_zone: locationZone,
        location_detail: locationDetail,
        floor: normalizeText(body.floor) || null,
        row_label: normalizeText(body.rowLabel) || null,
        column_label: normalizeText(body.columnLabel) || null,
        status: normalizeStatus(body.status),
        memo: normalizeText(body.memo) || null,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "사물함을 추가하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    console.error("Error creating locker:", error);
    return NextResponse.json(
      { error: "사물함을 추가하지 못했습니다." },
      { status: 400 },
    );
  }
}
