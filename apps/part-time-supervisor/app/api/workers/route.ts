import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { stripWorkerPII } from "@/lib/worker-privacy";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("workers")
      .select("*, assignments(assigned_at, room_slots, status, attendance_status, contract_status)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = data.map((worker) => {
      const assignments = worker.assignments ?? [];
      const completedCount = assignments.filter(
        (a: { status: string; attendance_status: string; contract_status: string }) =>
          a.status === "completed" ||
          (a.attendance_status === "confirmed" && a.contract_status === "confirmed")
      ).length;

      const latestAssignedAt = assignments.length > 0
        ? assignments
            .map((a: { assigned_at: string }) => a.assigned_at)
            .sort()
            .pop() ?? null
        : null;

      return {
        ...stripWorkerPII(worker),
        assignments: [{ count: completedCount }],
        latest_assigned_at: latestAssignedAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/workers error:", error);
    return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("workers")
      .insert({
        ...body,
        created_by: session.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/workers error:", error);
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}
