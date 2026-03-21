import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("interview_personnel")
      .select("*")
      .order("created_at", { ascending: false });

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/personnel error:", error);
    return NextResponse.json({ error: "Failed to fetch personnel" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_personnel")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/personnel error:", error);
    return NextResponse.json({ error: "Failed to create personnel" }, { status: 500 });
  }
}
