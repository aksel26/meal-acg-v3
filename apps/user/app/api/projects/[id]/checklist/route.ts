import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
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
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "체크리스트 제목은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createWorkClient();
    const { data, error } = await supabase
      .from("project_checklist_items")
      .insert({
        project_id: id,
        title,
        assignee_id:
          typeof body.assigneeId === "string" && body.assigneeId
            ? body.assigneeId
            : null,
        assignee_name:
          typeof body.assigneeName === "string" && body.assigneeName
            ? body.assigneeName
            : null,
        due_date: getDateOrNull(body.dueDate),
        sort_order: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        created_by: session.id,
        created_by_name: session.fullName,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/checklist error:", error);
    return NextResponse.json(
      { error: "체크리스트를 추가하지 못했습니다." },
      { status: 500 },
    );
  }
}

function getDateOrNull(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}
