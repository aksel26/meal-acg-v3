import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canUpdateProject, getProjectById } from "@/lib/projects";
import { canManageRequest, getRequestById } from "@/lib/requests";

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
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const requestRecord = requestId ? await getRequestById(requestId) : null;

    if (!requestRecord) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canManageRequest(session, requestRecord)) {
      return NextResponse.json({ error: "요청 권한이 없습니다." }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_requests")
      .upsert(
        {
          project_id: id,
          request_id: requestId,
          linked_by: session.id,
          linked_by_name: session.fullName,
        },
        { onConflict: "project_id,request_id" },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/requests error:", error);
    return NextResponse.json(
      { error: "요청을 프로젝트에 연결하지 못했습니다." },
      { status: 500 },
    );
  }
}
