import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const [personnelRes, workRecordsRes] = await Promise.all([
      supabase
        .from("interview_personnel")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("interview_work_records")
        .select("*")
        .eq("personnel_id", id)
        .order("work_date", { ascending: false }),
    ]);

    if (personnelRes.error) throw personnelRes.error;

    return NextResponse.json({
      ...personnelRes.data,
      work_records: workRecordsRes.data || [],
    });
  } catch (error) {
    console.error("GET /api/interview/personnel/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch personnel" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_personnel")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/interview/personnel/[id] error:", error);
    return NextResponse.json({ error: "Failed to update personnel" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("interview_personnel")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/interview/personnel/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete personnel" }, { status: 500 });
  }
}
