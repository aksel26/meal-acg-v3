import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("signature_image_path")
      .eq("id", id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (!assignment.signature_image_path) {
      return NextResponse.json({ error: "No signature found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from("signatures")
      .createSignedUrl(assignment.signature_image_path, 3600);

    if (error || !data) {
      console.error("Signature URL error:", error);
      return NextResponse.json(
        { error: `Failed to get signature URL: ${error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error("GET /api/assignments/[id]/signature error:", error);
    return NextResponse.json({ error: "Failed to get signature" }, { status: 500 });
  }
}
