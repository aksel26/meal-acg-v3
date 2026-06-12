import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { assertLibrarySettingsPayload } from "@/lib/library";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    await requireAdminPermission("library:write");
    const payload = assertLibrarySettingsPayload(await request.json());
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase
      .from("library_settings")
      .update({ default_rental_period_days: payload.defaultRentalPeriodDays })
      .eq("id", "default")
      .select()
      .single();

    if (error || !data) {
      console.error("Library settings update error:", error);
      return NextResponse.json(
        { error: "도서관 설정을 저장하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "도서관 설정 저장 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
