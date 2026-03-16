import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobPostingId: string }> }
) {
  try {
    const { jobPostingId } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("job_postings")
      .select("id, title, location, start_date, work_start, work_end, pay_rate, pay_type, headcount, work_type, shift_type, platform, lunch_start, lunch_end, status")
      .eq("id", jobPostingId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "공고를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/contract/[jobPostingId] error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
