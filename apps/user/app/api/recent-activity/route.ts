import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createWorkClient();

    const [
      { data: commentRows, error: commentsError },
      { data: requestRows, error: requestsError },
      { data: projectRows, error: projectsError },
    ] = await Promise.all([
      supabase
        .from("comments")
        .select("id, request_id, author_name, body, created_at")
        .eq("is_system", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("requests")
        .select("id, title, requester_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("projects")
        .select("id, title, owner_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    if (commentsError) throw commentsError;
    if (requestsError) throw requestsError;
    if (projectsError) throw projectsError;

    type CommentRow = {
      id: string;
      request_id: string;
      author_name: string;
      body: string;
      created_at: string;
    };
    type RequestRow = {
      id: string;
      title: string;
      requester_name: string;
      status: string;
      created_at: string;
    };
    type ProjectRow = {
      id: string;
      title: string;
      owner_name: string | null;
      status: string;
      created_at: string;
    };

    const comments = (commentRows ?? []) as CommentRow[];
    const requestIds = [...new Set(comments.map((c) => c.request_id))];
    const requestTitles = new Map<string, string>();

    if (requestIds.length > 0) {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title")
        .in("id", requestIds);
      if (error) throw error;
      for (const r of (data ?? []) as { id: string; title: string }[]) {
        requestTitles.set(r.id, r.title);
      }
    }

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        requestId: c.request_id,
        requestTitle: requestTitles.get(c.request_id) ?? "삭제된 요청",
        authorName: c.author_name,
        body: c.body,
        createdAt: c.created_at,
      })),
      requests: ((requestRows ?? []) as RequestRow[]).map((r) => ({
        id: r.id,
        title: r.title,
        requesterName: r.requester_name,
        status: r.status,
        createdAt: r.created_at,
      })),
      projects: ((projectRows ?? []) as ProjectRow[]).map((p) => ({
        id: p.id,
        title: p.title,
        ownerName: p.owner_name,
        status: p.status,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/recent-activity error:", error);
    return NextResponse.json(
      { error: "최근 활동을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
