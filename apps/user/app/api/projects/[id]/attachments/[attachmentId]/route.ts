import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import {
  deleteProjectAttachment,
  getProjectAttachmentSignedUrl,
} from "@/lib/storage";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuth();
    const { id, attachmentId } = await context.params;

    const supabase = createWorkClient();
    const { data: attachment, error } = await supabase
      .from("project_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("project_id", id)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "첨부파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const signedUrl = await getProjectAttachmentSignedUrl(
      attachment.storage_path,
    );

    if (!signedUrl) {
      return NextResponse.json(
        { error: "다운로드 링크를 생성하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error(
      "GET /api/projects/[id]/attachments/[attachmentId] error:",
      error,
    );
    return NextResponse.json(
      { error: "첨부파일을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, attachmentId } = await context.params;
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
    const { data: attachment, error: fetchError } = await supabase
      .from("project_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("project_id", id)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "첨부파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await supabase
      .from("project_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("project_id", id);

    if (deleteError) throw deleteError;

    await deleteProjectAttachment(attachment.storage_path);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "DELETE /api/projects/[id]/attachments/[attachmentId] error:",
      error,
    );
    return NextResponse.json(
      { error: "첨부파일을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
