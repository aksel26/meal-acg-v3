import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { generateWorkRecordsForAssignment } from "@/lib/work-records";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { assignmentId } = await request.json();
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    await generateWorkRecordsForAssignment(supabase, assignmentId);

    // 전체 목록 반환
    const { data: allRecords, error: fetchError } = await supabase
      .from("work_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("work_date", { ascending: true });

    if (fetchError) throw fetchError;
    return NextResponse.json(allRecords);
  } catch (error) {
    console.error("POST /api/work-records/generate error:", error);
    return NextResponse.json({ error: "Failed to generate work records" }, { status: 500 });
  }
}
