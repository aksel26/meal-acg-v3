import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: jobPostingId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // 1. worker 생성
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .insert({
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        gender: body.gender || null,
        birth_date: body.birth_date || null,
        address: body.address || null,
        bank_name: body.bank_name || null,
        account_number: body.account_number || null,
        experience: body.experience || null,
        warning: body.warning || null,
        note: body.note || null,
        status: "registered",
      })
      .select()
      .single();

    if (workerError) throw workerError;

    // 2. assignment 생성
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        worker_id: worker.id,
        job_posting_id: jobPostingId,
        status: "assigned",
      })
      .select()
      .single();

    if (assignmentError) {
      // assignment 실패 시 worker 롤백
      await supabase.from("workers").delete().eq("id", worker.id);
      throw assignmentError;
    }

    return NextResponse.json({ worker, assignment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/job-postings/[id]/workers error:", error);
    return NextResponse.json(
      { error: "지원자 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
