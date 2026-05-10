import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadAttachment, validateAttachment } from "@/lib/storage";
import { canManageRequest, getRequestById, recordEvent } from "@/lib/requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

    const formData = await request.formData();
    const file = formData.get("file");
    const commentId = formData.get("commentId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "첨부파일은 필수입니다." }, { status: 400 });
    }

    const validationError = validateAttachment(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { path, error: uploadError } = await uploadAttachment(
      id,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream",
    );

    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 500 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("attachments")
      .insert({
        request_id: id,
        comment_id: typeof commentId === "string" && commentId ? commentId : null,
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

    await recordEvent({
      requestId: id,
      actor: session,
      eventType: "attachment_uploaded",
      after: { attachmentId: data.id, fileName: file.name },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests/[id]/attachments error:", error);
    return NextResponse.json(
      { error: "첨부파일을 업로드하지 못했습니다." },
      { status: 500 },
    );
  }
}
