import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assertRentalRequestPayload } from "@/lib/library";
import { createServiceClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const payload = assertRentalRequestPayload(await request.json());
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const client = supabase as any;
    const { data: book, error: bookError } = await client
      .from("books")
      .select("id, status")
      .eq("id", payload.bookId)
      .eq("status", "available")
      .maybeSingle();

    if (bookError || !book) {
      return NextResponse.json(
        { error: "선택한 도서는 현재 대여 신청할 수 없습니다." },
        { status: 400 },
      );
    }

    const { data: blockedRentals } = await client
      .from("book_rentals")
      .select("id, requester_id, status")
      .eq("book_id", payload.bookId)
      .or(`status.eq.pending,and(status.in.(approved,return_requested),returned_at.is.null)`)
      .limit(1);

    if (blockedRentals?.length) {
      return NextResponse.json(
        { error: "이미 대여중이거나 승인 대기중인 도서입니다." },
        { status: 409 },
      );
    }

    const { data, error } = await client
      .from("book_rentals")
      .insert({
        book_id: payload.bookId,
        requester_id: session.id,
        status: "pending",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Library rental create error:", error);
      return NextResponse.json(
        { error: "도서 대여 신청에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/library/rentals error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "도서 대여 신청 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
