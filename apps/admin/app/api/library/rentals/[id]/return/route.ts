import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("library:write");
    const { id } = await params;
    const supabase = createServiceClient() as any;

    const { data: rental, error: rentalError } = await supabase
      .from("book_rentals")
      .select("id, status, returned_at")
      .eq("id", id)
      .maybeSingle();

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: "대여 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (rental.status !== "return_requested" || rental.returned_at) {
      return NextResponse.json(
        { error: "P&C 접수중인 대여만 반납완료 처리할 수 있습니다." },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("book_rentals")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        processed_by: session.userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Book return confirmation error:", error);
      return NextResponse.json(
        { error: "반납완료 처리에 실패했습니다." },
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
      { error: "반납완료 처리 중 오류가 발생했습니다." },
      { status: 400 },
    );
  }
}
