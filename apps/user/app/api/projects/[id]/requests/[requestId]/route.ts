import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateProject, getProjectById } from "@/lib/projects";
import { canUpdateRequest, getRequestById } from "@/lib/requests";

type RouteContext = {
  params: Promise<{ id: string; requestId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, requestId } = await context.params;
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

    const requestRecord = await getRequestById(requestId);
    if (!requestRecord) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canUpdateRequest(session, requestRecord)) {
      return NextResponse.json({ error: "요청 권한이 없습니다." }, { status: 403 });
    }

    const supabase = createWorkClient();
    const { error } = await supabase
      .from("project_requests")
      .delete()
      .eq("project_id", id)
      .eq("request_id", requestId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/requests/[requestId] error:", error);
    return NextResponse.json(
      { error: "요청 연결을 해제하지 못했습니다." },
      { status: 500 },
    );
  }
}
