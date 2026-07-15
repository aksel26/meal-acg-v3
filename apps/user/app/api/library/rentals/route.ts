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

    const [activeRentalResult, pendingRentalResult] = await Promise.all([
      client
        .from("book_rentals")
        .select("id")
        .eq("book_id", payload.bookId)
        .in("status", ["approved", "return_requested"])
        .is("returned_at", null)
        .limit(1),
      client
        .from("book_rentals")
        .select("id")
        .eq("book_id", payload.bookId)
        .eq("requester_id", session.id)
        .eq("status", "pending")
        .limit(1),
    ]);

    if (activeRentalResult.error || pendingRentalResult.error) {
      console.error("Library rental conflict check error:", {
        activeRentalError: activeRentalResult.error,
        pendingRentalError: pendingRentalResult.error,
      });
      return NextResponse.json(
        { error: "도서 대여 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    if (activeRentalResult.data?.length) {
      return NextResponse.json(
        { error: "이미 대여중인 도서입니다." },
        { status: 409 },
      );
    }

    if (pendingRentalResult.data?.length) {
      return NextResponse.json(
        { error: "이미 승인 대기중인 신청이 있습니다." },
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

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "이미 승인 대기중인 신청이 있습니다." },
        { status: 409 },
      );
    }

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
