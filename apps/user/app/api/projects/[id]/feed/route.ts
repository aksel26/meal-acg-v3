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
      .insert({
        project_id: id,
        content,
        created_by: session.id,
        created_by_name: session.fullName,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/projects/[id]/feed error:", error);
    return NextResponse.json(
      { error: "프로젝트 피드를 추가하지 못했습니다." },
      { status: 500 },
    );
  }
}
