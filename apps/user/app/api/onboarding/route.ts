import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import {
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
      .from("onboarding_requests")
      .select(
        `
          *,
          checklist:onboarding_checklist_items(
            id, title, description, responsible_party, is_completed,
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
    console.error("GET /api/onboarding error:", error);
    return NextResponse.json(
      { error: "온보딩 정보를 불러오지 못했습니다." },
      { status: 500 },
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
    const id = operationText(body.id, "온보딩", { required: true });
    const action = operationText(body.action, "작업", { required: true });
    if (action !== "check_item" && action !== "complete") {
      throw new Error("지원하지 않는 작업입니다.");
    }

    const { data: target, error: targetError } = await ctx.supabase
      .from("onboarding_requests")
      .select("id")
      .eq("id", id)
      .eq("member_id", ctx.session.id)
      .eq("status", "in_progress")
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) {
      return NextResponse.json(
        { error: "진행 중인 온보딩만 처리할 수 있습니다." },
        { status: 409 },
      );
    }

    if (action === "complete") {
      const { error } = await ctx.supabase.rpc("complete_onboarding_request", {
        p_request_id: id,
      });
      if (error?.message?.includes("ONBOARDING_CHECKLIST_INCOMPLETE")) {
        throw new Error("완료되지 않은 체크 항목이 있습니다.");
      }
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const itemId = operationText(body.itemId, "체크 항목", { required: true });
    const completed = Boolean(body.isCompleted);
    const { data, error } = await ctx.supabase
      .from("onboarding_checklist_items")
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completion_note: completed
          ? operationText(body.completionNote, "완료 메모", { max: 2000 }) ||
            null
          : null,
      })
      .eq("id", itemId)
      .eq("onboarding_request_id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("체크 항목을 찾을 수 없습니다.");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "온보딩을 처리하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
