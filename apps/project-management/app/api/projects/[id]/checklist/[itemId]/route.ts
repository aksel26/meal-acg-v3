import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, itemId } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!canUpdateProject(session, project)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("project_checklist_items")
      .delete()
      .eq("id", itemId)
      .eq("project_id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/checklist/[itemId] error:", error);
    return NextResponse.json(
      { error: "체크리스트를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, itemId } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!canUpdateProject(session, project)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json(
          { error: "체크리스트 제목은 비울 수 없습니다." },
          { status: 400 },
        );
      }
      updates.title = title;
    }

    if (typeof body.isDone === "boolean") {
      updates.is_done = body.isDone;
    }

    if (body.assigneeId !== undefined) {
      updates.assignee_id =
        typeof body.assigneeId === "string" && body.assigneeId
          ? body.assigneeId
          : null;
      updates.assignee_name =
        typeof body.assigneeName === "string" && body.assigneeName
          ? body.assigneeName
          : null;
    }

    if (body.dueDate !== undefined) {
      updates.due_date = getDateOrNull(body.dueDate);
    }

    if (typeof body.sortOrder === "number") {
      updates.sort_order = body.sortOrder;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_checklist_items")
      .update(updates)
      .eq("id", itemId)
      .eq("project_id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/projects/[id]/checklist/[itemId] error:", error);
    return NextResponse.json(
      { error: "체크리스트를 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

function getDateOrNull(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}
