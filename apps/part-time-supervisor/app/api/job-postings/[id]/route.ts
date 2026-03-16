import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("job_postings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch job posting" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("job_postings")
      .update({ ...body, end_date: body.start_date })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to update job posting" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { count } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .in("status", ["assigned", "working"]);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "활성 배정이 있는 공고는 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("job_postings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete job posting" }, { status: 500 });
  }
}
