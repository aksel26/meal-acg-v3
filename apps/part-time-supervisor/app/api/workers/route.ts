import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("workers")
      .select("*, assignments(room_slots, status, attendance_status, contract_status)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = data.map((worker) => {
      const completedCount = (worker.assignments ?? []).filter(
        (a: { status: string; attendance_status: string; contract_status: string }) =>
          a.status === "completed" ||
          (a.attendance_status === "confirmed" && a.contract_status === "confirmed")
      ).length;

      return {
        ...worker,
        assignments: [{ count: completedCount }],
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
