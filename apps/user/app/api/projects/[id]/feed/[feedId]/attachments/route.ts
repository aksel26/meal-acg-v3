import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import {
  uploadProjectFeedAttachment,
  validateAttachment,
} from "@/lib/storage";
import { canUpdateProject, getProjectById } from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string; feedId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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
    const { data: feedItem, error: feedError } = await supabase
      .from("project_feed_items")
      .select("id")
      .eq("id", feedId)
      .eq("project_id", id)
      .is("deleted_at", null)
      .single();

    if (feedError || !feedItem) {
      return NextResponse.json(
        { error: "프로젝트 피드를 찾을 수 없습니다." },
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
      .insert({
        project_id: id,
        feed_item_id: feedId,
        file_name: file.name,
        storage_path: path,
        content_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: session.id,
        uploaded_by_name: session.fullName,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/feed/[feedId]/attachments error:", error);
    return NextResponse.json(
      { error: "피드 첨부파일을 업로드하지 못했습니다." },
      { status: 500 },
    );
  }
}
