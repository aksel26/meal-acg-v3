import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { ids } = await request.json();

    if (!ids?.length) {
      return NextResponse.json({ error: "삭제할 항목을 선택하세요." }, { status: 400 });
    }

    const { error } = await supabase
      .from("job_postings")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("POST /api/job-postings/bulk-delete error:", error);
    return NextResponse.json({ error: "Failed to delete job postings" }, { status: 500 });
  }
}
