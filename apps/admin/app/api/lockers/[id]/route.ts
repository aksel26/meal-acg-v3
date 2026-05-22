import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  const status = normalizeText(value);
  if (status === "available" || status === "assigned" || status === "disabled") {
    return status;
  }
  throw new Error("사물함 상태를 확인해주세요.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("meal:write");
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient() as any;

    const { data, error } = await supabase
      .from("lockers")
      .update({
        code: normalizeText(body.code),
        location_zone: normalizeText(body.locationZone),
        location_detail: normalizeText(body.locationDetail),
        floor: normalizeText(body.floor) || null,
        row_label: normalizeText(body.rowLabel) || null,
        column_label: normalizeText(body.columnLabel) || null,
        status: normalizeStatus(body.status),
        memo: normalizeText(body.memo) || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "사물함 정보를 수정하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사물함 정보를 수정하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
