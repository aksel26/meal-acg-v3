import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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

    // Update to confirmed
    const { data, error } = await supabase
      .from("assignments")
      .update({
        contract_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: session.fullName,
      })
      .eq("id", id)
      .select("*, worker:workers(id, name, phone), job_posting:job_postings(id, title)")
      .single();

    if (error) {
      console.error("Confirm update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/assignments/[id]/confirm error:", error);
    return NextResponse.json({ error: "Failed to confirm assignment" }, { status: 500 });
  }
}
