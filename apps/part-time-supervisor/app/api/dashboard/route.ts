import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createServiceClient();

    const [openJobs, totalWorkers, workingWorkers, recentJobs] = await Promise.all([
      supabase.from("job_postings").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("workers").select("*", { count: "exact", head: true }),
      supabase.from("workers").select("*", { count: "exact", head: true }).eq("status", "working"),
      supabase.from("job_postings").select("id, title, status, headcount, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    return NextResponse.json({
      openJobCount: openJobs.count || 0,
      totalWorkerCount: totalWorkers.count || 0,
      workingWorkerCount: workingWorkers.count || 0,
      recentJobs: recentJobs.data || [],
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
