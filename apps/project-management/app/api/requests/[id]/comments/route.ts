import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
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

    const body = await request.json();
    const commentBody = typeof body.body === "string" ? body.body.trim() : "";

    if (!commentBody) {
      return NextResponse.json({ error: "댓글 내용은 필수입니다." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        request_id: id,
        author_id: session.id,
        author_name: session.fullName,
        body: commentBody,
      })
      .select()
      .single();

    if (error) throw error;

    await recordEvent({
      requestId: id,
      actor: session,
      eventType: "comment_created",
      after: { commentId: data.id },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests/[id]/comments error:", error);
    return NextResponse.json(
      { error: "댓글을 작성하지 못했습니다." },
      { status: 500 },
    );
  }
}
