import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { syncWorkerStatus } from "@/lib/worker-status";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch assignment and verify contract_status
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, contract_status")
      .eq("id", id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.contract_status !== "signed") {
      return NextResponse.json(
        { error: "Only signed contracts can be confirmed" },
        { status: 400 }
      );
    }

    // 출석 상태 조회
    const { data: fullAssignment, error: fullFetchError } = await supabase
      .from("assignments")
      .select("attendance_status")
      .eq("id", id)
      .single();

    if (fullFetchError) throw fullFetchError;

    const bothConfirmed = fullAssignment.attendance_status === "confirmed";

    // Update to confirmed
    const { data, error } = await supabase
      .from("assignments")
      .update({
        contract_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: session.fullName,
        ...(bothConfirmed && { status: "completed" }),
      })
      .eq("id", id)
      .select("*, worker:workers(id, name, phone), job_posting:job_postings(id, title)")
      .single();

    if (error) {
      console.error("Confirm update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await syncWorkerStatus(supabase, data.worker_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/assignments/[id]/confirm error:", error);
    return NextResponse.json({ error: "Failed to confirm assignment" }, { status: 500 });
  }
}
