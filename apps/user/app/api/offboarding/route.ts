import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
  operationDate,
  operationPage,
  operationPageData,
  operationText,
} from "utils/company-operations";

async function context() {
  const session = await getSessionUser();
  if (!session) return null;
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");
  return { session, supabase: supabase as any };
}

export async function GET(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const pagination = operationPage(new URL(request.url).searchParams);
    const { data, error } = await ctx.supabase
      .from("offboarding_requests")
      .select(
        `
          *,
          checklist:offboarding_checklist_items(
            id, title, responsible_party, is_completed,
            completion_note, completed_at, sort_order
          )
        `,
      )
      .eq("member_id", ctx.session.id)
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    if (error) throw error;
    const requestPage = operationPageData(data, pagination);
    return NextResponse.json({
      requests: requestPage.items,
      pagination: requestPage.pagination,
    });
  } catch (error) {
    console.error("GET /api/offboarding error:", error);
    return NextResponse.json(
      { error: "오프보딩 요청을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const payload = {
      member_id: ctx.session.id,
      requested_final_working_date: operationDate(
        body.requestedFinalWorkingDate,
        "희망 최종 근무일",
      ),
      reason: operationText(body.reason, "사유", {
        required: true,
        max: 1000,
      }),
      note: operationText(body.note, "메모", { max: 2000 }) || null,
    };
    const { data, error } = await ctx.supabase
      .from("offboarding_requests")
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 진행 중인 오프보딩 요청이 있습니다." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "오프보딩 요청을 등록하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = operationText(body.id, "요청", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    const changes =
      action === "cancel"
        ? { status: "cancelled", processed_at: new Date().toISOString() }
        : action === "update"
          ? {
              requested_final_working_date: operationDate(
                body.requestedFinalWorkingDate,
                "희망 최종 근무일",
              ),
              reason: operationText(body.reason, "사유", {
                required: true,
                max: 1000,
              }),
              note: operationText(body.note, "메모", { max: 2000 }) || null,
            }
          : null;
    if (!changes) throw new Error("지원하지 않는 작업입니다.");

    const { data, error } = await ctx.supabase
      .from("offboarding_requests")
      .update(changes)
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "수정 가능한 대기 요청을 찾을 수 없습니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "요청을 변경하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
