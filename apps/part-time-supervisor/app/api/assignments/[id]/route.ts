import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("assignments")
      .update(body)
      .eq("id", id)
      .select("*, worker:workers(id, name), job_posting:job_postings(id, title)")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
