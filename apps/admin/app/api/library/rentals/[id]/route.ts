import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { assertRentalDecisionPayload } from "@/lib/library";
import { createServiceClient } from "@/lib/supabase/server";

const ACTIVE_RENTAL_CONFLICT_MESSAGE =
  "이미 대여중인 도서는 승인할 수 없습니다.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("library:write");
    const { id } = await params;
    const payload = assertRentalDecisionPayload(await request.json());
    const supabase = createServiceClient() as any;

    const { data: rental, error: rentalError } = await supabase
      .from("book_rentals")
      .select("id, book_id, status")
      .eq("id", id)
      .maybeSingle();

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: "대여 신청을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (rental.status !== "pending") {
      return NextResponse.json(
        { error: "대기 상태의 신청만 처리할 수 있습니다." },
        { status: 409 },
      );
    }

    if (payload.status === "approved") {
      const { data: activeRentals } = await supabase
        .from("book_rentals")
        .select("id")
        .eq("book_id", rental.book_id)
        .in("status", ["approved", "return_requested"])
        .is("returned_at", null)
        .limit(1);

      if (activeRentals?.length) {
        return NextResponse.json(
          { error: ACTIVE_RENTAL_CONFLICT_MESSAGE },
          { status: 409 },
        );
      }

      const [{ data: book }, { data: settings }] = await Promise.all([
        supabase
          .from("books")
          .select("status, rental_period_days_override")
          .eq("id", rental.book_id)
          .single(),
        supabase
          .from("library_settings")
          .select("default_rental_period_days")
          .eq("id", "default")
          .single(),
      ]);

      if (!book || book.status !== "available") {
        return NextResponse.json(
          { error: "대여중지 도서는 승인할 수 없습니다." },
          { status: 409 },
        );
      }

      const periodDays =
        book.rental_period_days_override ??
        settings?.default_rental_period_days ??
        14;
      const approvedAt = new Date();
      const dueAt = new Date(approvedAt);
      dueAt.setDate(dueAt.getDate() + periodDays);

      const { data, error } = await supabase
        .from("book_rentals")
        .update({
          status: "approved",
          approved_at: approvedAt.toISOString(),
          rented_at: approvedAt.toISOString(),
          due_at: dueAt.toISOString(),
          processed_by: session.userId,
          reject_reason: null,
        })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (error?.code === "23505") {
        return NextResponse.json(
          { error: ACTIVE_RENTAL_CONFLICT_MESSAGE },
          { status: 409 },
        );
      }
      if (error) {
        console.error("Book rental approval error:", error);
        return NextResponse.json(
          { error: "대여 신청을 승인하지 못했습니다." },
          { status: 500 },
        );
      }
      if (!data) {
        return NextResponse.json(
          { error: "대기 상태의 신청만 처리할 수 있습니다." },
          { status: 409 },
        );
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("book_rentals")
      .update({
        status: "rejected",
        processed_by: session.userId,
        reject_reason: payload.rejectReason,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      console.error("Book rental rejection error:", error);
      return NextResponse.json(
        { error: "대여 신청을 반려하지 못했습니다." },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "대기 상태의 신청만 처리할 수 있습니다." },
        { status: 409 },
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
            : "대여 신청 처리 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
