import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    const personnelId = searchParams.get("personnel_id");

    let query = supabase
      .from("interview_work_records")
      .select("*, personnel:interview_personnel(id, name, role, pay_type, default_pay_rate)")
      .order("work_date", { ascending: true });

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]!;
      query = query.gte("work_date", startDate).lte("work_date", endDate);
    }

    if (personnelId) {
      query = query.eq("personnel_id", personnelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/work-records error:", error);
    return NextResponse.json({ error: "Failed to fetch work records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { personnel_id, work_date, work_hours } = body;
    if (!personnel_id || !work_date || work_hours == null) {
      return NextResponse.json(
        { error: "personnel_id, work_date, and work_hours are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("interview_work_records")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/work-records error:", error);
    return NextResponse.json({ error: "Failed to create work record" }, { status: 500 });
  }
}
