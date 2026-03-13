import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const [workerRes, assignmentsRes, contractsRes] = await Promise.all([
      supabase
        .from("workers")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("assignments")
        .select("*, job_posting:job_postings(id, title, status)")
        .eq("worker_id", id)
        .order("assigned_at", { ascending: false }),
      supabase
        .from("contract_documents")
        .select("*")
        .eq("worker_id", id)
        .order("uploaded_at", { ascending: false }),
    ]);

    if (workerRes.error) throw workerRes.error;

    return NextResponse.json({
      ...workerRes.data,
      assignments: assignmentsRes.data || [],
      contracts: contractsRes.data || [],
    });
  } catch (error) {
    console.error("GET /api/workers/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch worker" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("workers")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/workers/[id] error:", error);
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("workers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workers/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}
