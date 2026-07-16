import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildWorkerSessionCookie } from "@/lib/worker-session";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobPostingId: string }> },
) {
  try {
    const { jobPostingId } = await params;
    const { name, phone, email } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "이름과 전화번호를 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const [addressAllowed, identityAllowed] = await Promise.all([
      consumeRateLimit(supabase, request, "worker-verify-address", {
        limit: 30,
        windowSeconds: 15 * 60,
      }),
      consumeRateLimit(supabase, request, "worker-verify-identity", {
        limit: 5,
        windowSeconds: 15 * 60,
        subject: `${jobPostingId}:${phone.replace(/\D/g, "")}`,
      }),
    ]);
    if (!addressAllowed || !identityAllowed) {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    // 1. worker 매칭
    const { data: workers, error: workerError } = await supabase
      .from("workers")
      .select("id, name, phone")
      .eq("name", name.trim())
      .eq("phone", phone.trim());

    if (workerError) throw workerError;

    if (!workers || workers.length === 0) {
      return NextResponse.json(
        { error: "입력 정보를 확인할 수 없습니다." },
        { status: 401 },
      );
    }

    // 2. 해당 공고의 assignment 확인
    const workerIds = workers.map((w) => w.id);
    const { data: assignments, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, worker_id, contract_status, signed_at")
      .eq("job_posting_id", jobPostingId)
      .in("worker_id", workerIds);

    if (assignmentError) throw assignmentError;

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: "입력 정보를 확인할 수 없습니다." },
        { status: 401 },
      );
    }

    const assignment = assignments[0]!;
    const worker = workers.find((w) => w.id === assignment.worker_id)!;

    // 이메일 검증/저장
    if (email) {
      const { data: workerDetail } = await supabase
        .from("workers")
        .select("email")
        .eq("id", worker.id)
        .single();

      if (workerDetail?.email && workerDetail.email !== email.trim()) {
        return NextResponse.json(
          { error: "입력 정보를 확인할 수 없습니다." },
          { status: 401 },
        );
      }
    }

    const response = NextResponse.json({
      worker_name: worker.name,
      already_signed: assignment.contract_status !== null,
    });
    response.cookies.set(
      await buildWorkerSessionCookie({
        jobPostingId,
        workerId: worker.id,
        assignmentId: assignment.id,
      }),
    );
    return response;
  } catch (error) {
    console.error("POST /api/contract/[jobPostingId]/verify error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
