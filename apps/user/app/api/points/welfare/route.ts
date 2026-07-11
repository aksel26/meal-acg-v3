import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// "YYYY-MM" → "YYYY-H1" or "YYYY-H2" 변환
function toHalfYearPeriod(monthlyPeriod: string): string {
  const parts = monthlyPeriod.split("-");
  const half = parseInt(parts[1] ?? "1", 10) <= 6 ? "H1" : "H2";
  return `${parts[0]}-${half}`;
}

// GET: 복지포인트 데이터 조회
export async function GET(request: NextRequest) {
  try {
    // 본인 복지포인트만 조회 (요청의 member_id는 신뢰하지 않음)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = sessionUser.id;
    const period = searchParams.get("period");

    if (!period) {
      return NextResponse.json(
        { error: "period는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // budget_summary 뷰에서 해당 멤버의 복지포인트 요약 조회
    const halfYearPeriod = toHalfYearPeriod(period);
    const { data: summary, error: summaryError } = await supabase
      .from("budget_summary")
      .select("*")
      .eq("member_id", memberId)
      .eq("type", "복지포인트")
      .eq("period", halfYearPeriod)
      .maybeSingle();

    if (summaryError) {
      console.error("복지포인트 요약 조회 오류:", summaryError);
      return NextResponse.json(
        { error: "복지포인트 요약 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 해당 allocation의 사용내역 조회 (선택 월 기준 필터)
    const monthStart = `${period}-01`;
    const nextMonth = new Date(`${period}-01T00:00:00`);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: Record<string, any>[] = [];
    if (summary?.allocation_id) {
      const { data: usageRecords, error: recordsError } = await supabase
        .from("usage_records")
        .select(
          `
          *,
          member:members!usage_records_member_id_fkey (
            id, full_name, member_role
          )
        `
        )
        .eq("allocation_id", summary.allocation_id)
        .gte("used_at", monthStart)
        .lt("used_at", monthEnd)
        .order("used_at", { ascending: false });

      if (recordsError) {
        console.error("사용내역 조회 오류:", recordsError);
        return NextResponse.json(
          { error: "사용내역 조회에 실패했습니다." },
          { status: 500 }
        );
      }

      records = usageRecords || [];
    }

    return NextResponse.json({ summary, records });
  } catch (error) {
    console.error("복지포인트 조회 오류:", error);
    return NextResponse.json(
      { error: "복지포인트 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 복지포인트 사용내역 등록
export async function POST(request: NextRequest) {
  try {
    // 사용내역은 로그인 세션 본인 명의로만 등록 (body의 member_id 위조 차단)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      allocation_id,
      amount,
      description,
      used_at,
      companions,
      co_payers,
      receipt_url,
      notes,
      delay_reason,
    } = body;
    const member_id = sessionUser.id;

    // 필수 필드 검증
    if (!allocation_id || !amount || !description || !used_at) {
      return NextResponse.json(
        {
          error:
            "필수 필드가 누락되었습니다. (allocation_id, amount, description, used_at)",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // allocation이 본인 소유인지 검증 (남의 예산에 청구 차단)
    const { data: allocation } = await supabase
      .from("budget_allocations")
      .select("member_id")
      .eq("id", allocation_id)
      .single();

    if (!allocation || allocation.member_id !== member_id) {
      return NextResponse.json(
        { error: "본인 예산에만 사용내역을 등록할 수 있습니다." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("usage_records")
      .insert({
        allocation_id,
        member_id,
        type: "복지포인트" as const,
        amount,
        description,
        used_at,
        companions: companions || [],
        co_payers: co_payers || [],
        receipt_url: receipt_url || null,
        notes: notes || null,
        delay_reason: delay_reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error("복지포인트 사용내역 등록 오류:", error);
      return NextResponse.json(
        { error: "사용내역 등록에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("복지포인트 등록 오류:", error);
    return NextResponse.json(
      { error: "사용내역 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT: 복지포인트 사용내역 수정
export async function PUT(request: NextRequest) {
  try {
    // 본인 사용내역만 수정 가능
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { id, amount, description, used_at, companions, co_payers, receipt_url, notes, delay_reason } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // 소유권 + 검토 완료 여부 확인
    const { data: existing, error: fetchError } = await supabase
      .from("usage_records")
      .select("id, is_reviewed, review_status, member_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "해당 사용내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existing.member_id !== sessionUser.id) {
      return NextResponse.json(
        { error: "본인의 사용내역만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    if ((existing.review_status ?? 0) >= 1) {
      return NextResponse.json(
        { error: "P&C 확인된 내역은 수정할 수 없습니다. P&C에 문의 바랍니다." },
        { status: 403 }
      );
    }

    // 수정할 필드만 업데이트 객체에 포함
    const updateData: Record<string, unknown> = {};
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (used_at !== undefined) updateData.used_at = used_at;
    if (companions !== undefined) updateData.companions = companions;
    if (co_payers !== undefined) updateData.co_payers = co_payers;
    if (receipt_url !== undefined) updateData.receipt_url = receipt_url;
    if (notes !== undefined) updateData.notes = notes;
    if (delay_reason !== undefined) updateData.delay_reason = delay_reason;

    const { data, error } = await supabase
      .from("usage_records")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("복지포인트 수정 오류:", error);
      return NextResponse.json(
        { error: "사용내역 수정에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("복지포인트 수정 오류:", error);
    return NextResponse.json(
      { error: "사용내역 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 복지포인트 사용내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 본인 사용내역만 삭제 가능 (요청의 member_id는 신뢰하지 않음)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const memberId = sessionUser.id;

    if (!id) {
      return NextResponse.json(
        { error: "id는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    // 검토 완료 여부 확인
    const { data: existing, error: fetchError } = await supabase
      .from("usage_records")
      .select("id, is_reviewed, review_status, member_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "해당 사용내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if ((existing.review_status ?? 0) >= 1) {
      return NextResponse.json(
        { error: "P&C 확인된 내역은 삭제할 수 없습니다. P&C에 문의 바랍니다." },
        { status: 403 }
      );
    }

    if (existing.member_id !== memberId) {
      return NextResponse.json(
        { error: "본인의 사용내역만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("usage_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("복지포인트 삭제 오류:", error);
      return NextResponse.json(
        { error: "사용내역 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("복지포인트 삭제 오류:", error);
    return NextResponse.json(
      { error: "사용내역 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
