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
      .from("job_postings")
      .select("*, assignments(count)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/job-postings error:", error);
    return NextResponse.json({ error: "Failed to fetch job postings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("job_postings")
      .insert({
        ...body,
        created_by: session.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/job-postings error:", error);
    return NextResponse.json({ error: "Failed to create job posting" }, { status: 500 });
  }
}
