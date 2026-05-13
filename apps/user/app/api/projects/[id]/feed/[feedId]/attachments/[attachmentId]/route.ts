import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import {
  deleteProjectAttachment,
  getProjectAttachmentSignedUrl,
  uploadProjectFeedAttachment,
  validateAttachment,
} from "@/lib/storage";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string; feedId: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuth();
    const { id, feedId, attachmentId } = await context.params;

    const supabase = createWorkClient();
    const { data: attachment, error } = await supabase
      .from("project_feed_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("project_id", id)
      .eq("feed_item_id", feedId)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: "첨부파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const signedUrl = await getProjectAttachmentSignedUrl(attachment.storage_path);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "다운로드 링크를 생성하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error(
      "GET /api/projects/[id]/feed/[feedId]/attachments/[attachmentId] error:",
      error,
    );
    return NextResponse.json(
      { error: "첨부파일을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, feedId, attachmentId } = await context.params;
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
      .from("project_feed_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("project_id", id)
      .eq("feed_item_id", feedId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "첨부파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "첨부파일은 필수입니다." },
        { status: 400 },
      );
    }

    const validationError = validateAttachment(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { path, error: uploadError } = await uploadProjectFeedAttachment(
      id,
      feedId,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream",
    );

    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("project_feed_attachments")
      .update({
        file_name: file.name,
        storage_path: path,
        content_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: session.id,
        uploaded_by_name: session.fullName,
      })
      .eq("id", attachmentId)
      .eq("project_id", id)
      .eq("feed_item_id", feedId)
      .select()
      .single();

    if (error) throw error;

    await deleteProjectAttachment(attachment.storage_path);

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "PATCH /api/projects/[id]/feed/[feedId]/attachments/[attachmentId] error:",
      error,
    );
    return NextResponse.json(
      { error: "첨부파일을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, feedId, attachmentId } = await context.params;
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
      .from("project_feed_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .eq("project_id", id)
      .eq("feed_item_id", feedId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: "첨부파일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("project_feed_attachments")
      .delete()
      .eq("id", attachmentId)
      .eq("project_id", id)
      .eq("feed_item_id", feedId);

    if (error) throw error;

    await deleteProjectAttachment(attachment.storage_path);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "DELETE /api/projects/[id]/feed/[feedId]/attachments/[attachmentId] error:",
      error,
    );
    return NextResponse.json(
      { error: "첨부파일을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}
