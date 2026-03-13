import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch assignment and verify contract_status
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, contract_status, signature_image_path")
      .eq("id", id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.contract_status !== "signed") {
      return NextResponse.json(
        { error: "Only signed contracts can be rejected" },
        { status: 400 }
      );
    }

    // Delete signature image from storage (non-blocking)
    if (assignment.signature_image_path) {
      const { error: storageError } = await supabase.storage
        .from("signatures")
        .remove([assignment.signature_image_path]);
      if (storageError) {
        console.error("Storage remove error (non-blocking):", storageError);
      }
    }

    // Reset contract fields so the worker can re-sign
    const { data, error } = await supabase
      .from("assignments")
      .update({
        contract_status: null,
        signature_image_path: null,
        signed_at: null,
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq("id", id)
      .select("*, worker:workers(id, name, phone), job_posting:job_postings(id, title)")
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /api/assignments/[id]/reject error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
