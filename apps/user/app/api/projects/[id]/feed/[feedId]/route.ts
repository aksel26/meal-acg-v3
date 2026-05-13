import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string; feedId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, feedId } = await context.params;
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
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "피드 내용을 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createWorkClient();
    const { data, error } = await supabase
      .from("project_feed_items")
      .update({ content })
      .eq("id", feedId)
      .eq("project_id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/projects/[id]/feed/[feedId] error:", error);
    return NextResponse.json(
      { error: "프로젝트 피드를 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, feedId } = await context.params;
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

    const supabase = createWorkClient();
    const { error } = await supabase
      .from("project_feed_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", feedId)
      .eq("project_id", id)
      .is("deleted_at", null);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/feed/[feedId] error:", error);
    return NextResponse.json(
      { error: "프로젝트 피드를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
