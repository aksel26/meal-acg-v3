import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const client = supabase as any;
    const { data: rental, error: rentalError } = await client
      .from("book_rentals")
      .select("id, requester_id, status, returned_at")
      .eq("id", id)
      .maybeSingle();

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: "도서 대여 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (rental.requester_id !== session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (rental.returned_at) {
      return NextResponse.json(
        { error: "이미 반납 완료된 대여 내역입니다." },
        { status: 409 },
      );
    }

    if (rental.status === "return_requested") {
      return NextResponse.json(rental);
    }

    if (rental.status !== "approved") {
      return NextResponse.json(
        { error: "승인된 도서만 반납 신청할 수 있습니다." },
        { status: 400 },
      );
    }

    const { data, error } = await client
      .from("book_rentals")
      .update({
        status: "return_requested",
        return_requested_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Library return request error:", error);
      return NextResponse.json(
        { error: "도서 반납 신청에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/library/rentals/[id]/return error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "도서 반납 신청 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
