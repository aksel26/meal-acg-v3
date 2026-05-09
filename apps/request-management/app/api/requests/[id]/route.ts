import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  canManageRequest,
  canUpdateRequest,
  getRequestById,
  isRequestPriority,
  isRequestStatus,
  recordEvent,
} from "@/lib/requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const requestRecord = await getRequestById(id);

    if (!requestRecord) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canManageRequest(session, requestRecord)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const supabase = createServiceClient();
    const [{ data: comments, error: commentsError }, { data: attachments, error: attachmentsError }, { data: events, error: eventsError }] =
      await Promise.all([
        supabase
          .from("comments")
          .select("*")
          .eq("request_id", id)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
        supabase
          .from("attachments")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("events")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: true }),
      ]);

    if (commentsError) throw commentsError;
    if (attachmentsError) throw attachmentsError;
    if (eventsError) throw eventsError;

    return NextResponse.json({
      request: requestRecord,
      comments,
      attachments,
      events,
    });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "요청 상세를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const current = await getRequestById(id);

    if (!current) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canUpdateRequest(session, current)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "제목은 비울 수 없습니다." }, { status: 400 });
      }
      updates.title = title;
    }

    if (typeof body.body === "string") {
      updates.body = body.body;
    }

    if (body.priority !== undefined) {
      if (!isRequestPriority(body.priority)) {
        return NextResponse.json({ error: "우선순위 값이 올바르지 않습니다." }, { status: 400 });
      }
      updates.priority = body.priority;
    }

    if (body.status !== undefined) {
      if (!isRequestStatus(body.status)) {
        return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.assigneeId !== undefined) {
      updates.assignee_id = body.assigneeId || null;
      updates.assignee_name = body.assigneeName || null;
      updates.assignee_ids = body.assigneeId ? [body.assigneeId] : [];
      updates.assignee_names = body.assigneeName ? [body.assigneeName] : [];
    }

    if (body.assigneeIds !== undefined) {
      const assigneeIds = Array.isArray(body.assigneeIds)
        ? body.assigneeIds.filter((id: unknown) => typeof id === "string" && id)
        : [];
      const assigneeNames = Array.isArray(body.assigneeNames)
        ? body.assigneeNames.filter((name: unknown) => typeof name === "string" && name)
        : [];
      updates.assignee_ids = assigneeIds;
      updates.assignee_names = assigneeNames;
      updates.assignee_id = assigneeIds[0] || null;
      updates.assignee_name = assigneeNames[0] || null;
    }

    if (body.teamName !== undefined) {
      updates.team_name = body.teamName || null;
      updates.team_names = body.teamName ? [body.teamName] : [];
    }

    if (body.teamNames !== undefined) {
      const teamNames = Array.isArray(body.teamNames)
        ? body.teamNames.filter((name: unknown) => typeof name === "string" && name)
        : [];
      updates.team_names = teamNames;
      updates.team_name = teamNames[0] || null;
    }

    if (body.customerNames !== undefined) {
      updates.customer_names = Array.isArray(body.customerNames)
        ? body.customerNames.filter((name: unknown) => typeof name === "string" && name)
        : [];
    }

    if (body.affiliateNames !== undefined) {
      updates.affiliate_names = Array.isArray(body.affiliateNames)
        ? body.affiliateNames.filter((name: unknown) => typeof name === "string" && name)
        : [];
    }

    if (body.requestType !== undefined) {
      updates.request_type = body.requestType || null;
      updates.request_type_name = body.requestTypeName || null;
    }

    if (body.completionNote !== undefined) {
      updates.completion_note =
        typeof body.completionNote === "string" ? body.completionNote.trim() : null;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === "") {
        updates.due_date = null;
      } else if (
        typeof body.dueDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
      ) {
        updates.due_date = body.dueDate;
      } else {
        return NextResponse.json(
          { error: "마감일 형식이 올바르지 않습니다." },
          { status: 400 },
        );
      }
    }

    if (updates.status === "완료") {
      const note = updates.completion_note ?? current.completion_note;
      if (typeof note !== "string" || note.trim().length < 5) {
        return NextResponse.json(
          { error: "완료 처리에는 5자 이상의 완료 메모가 필요합니다." },
          { status: 400 },
        );
      }
      updates.completion_note = note.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(current);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await recordEvent({
      requestId: id,
      actor: session,
      eventType: "request_updated",
      before: current,
      after: updates,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "요청을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}
