import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";
import { generateWorkRecordsForAssignment } from "@/lib/work-records";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    const search = searchParams.get("search") ?? "";

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month are required" },
        { status: 400 }
      );
    }

    // 월의 시작/끝 날짜
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]!;

    const supabase = createServiceClient();

    // Auto-complete: 계약·출근 둘 다 confirmed인데 status가 completed가 아닌 assignment 자동 전환
    const { data: stuckAssignments } = await supabase
      .from("assignments")
      .select("id")
      .eq("contract_status", "confirmed")
      .eq("attendance_status", "confirmed")
      .neq("status", "completed");

    if (stuckAssignments && stuckAssignments.length > 0) {
      const stuckIds = stuckAssignments.map((a) => a.id);
      await supabase
        .from("assignments")
        .update({ status: "completed" })
        .in("id", stuckIds);
    }

    // Backfill: completed assignment 중 해당 월에 work_records가 없는 건 자동 생성
    const { data: completedAssignments } = await supabase
      .from("assignments")
      .select("id, job_posting:job_postings(start_date, end_date)")
      .eq("status", "completed");

    if (completedAssignments) {
      for (const a of completedAssignments) {
        const jp = a.job_posting as unknown as {
          start_date: string;
          end_date: string;
        } | null;
        if (!jp) continue;

        // 공고 기간이 요청 월과 겹치는지 확인
        if (jp.end_date < startDate || jp.start_date > endDate) continue;

        // 해당 assignment의 해당 월 work_records 존재 여부 확인
        const { count } = await supabase
          .from("work_records")
          .select("id", { count: "exact", head: true })
          .eq("assignment_id", a.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate);

        if (count === 0) {
          await generateWorkRecordsForAssignment(supabase, a.id);
        }
      }
    }

    // 해당 월의 work_records가 있는 assignments 조회 (worker, job_posting 포함)
    const { data: records, error } = await supabase
      .from("work_records")
      .select(
        `
        id, work_date, work_hours, note,
        assignment:assignments(
          id, pay_rate_override, pay_type_override, status,
          worker:workers(id, name),
          job_posting:job_postings(id, title, start_date, end_date, pay_rate, pay_type)
        )
      `
      )
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (error) throw error;

    // 지원자별 → 공고별 그룹핑
    type WorkerGroup = {
      workerId: string;
      workerName: string;
      postings: Map<
        string,
        {
          jobPostingId: string;
          jobPostingTitle: string;
          assignmentId: string;
          startDate: string;
          endDate: string;
          payType: "hourly" | "daily";
          effectivePayRate: number;
          isOverridden: boolean;
          workDays: number;
          totalHours: number;
          subtotal: number;
        }
      >;
    };

    const workerMap = new Map<string, WorkerGroup>();

    for (const rec of records ?? []) {
      const a = rec.assignment as unknown as Record<string, unknown>;
      if (!a || a.status === "cancelled") continue;

      const worker = a.worker as { id: string; name: string } | null;
      const jp = a.job_posting as {
        id: string;
        title: string;
        start_date: string;
        end_date: string;
        pay_rate: number;
        pay_type: "hourly" | "daily";
      } | null;
      if (!worker || !jp) continue;

      // 검색 필터
      if (search && !worker.name.toLowerCase().includes(search.toLowerCase()))
        continue;

      const effectivePayRate =
        (a.pay_rate_override as number | null) ?? jp.pay_rate;
      const effectivePayType = ((a.pay_type_override as string | null) ??
        jp.pay_type) as "hourly" | "daily";
      const isOverridden =
        a.pay_rate_override != null || a.pay_type_override != null;

      if (!workerMap.has(worker.id)) {
        workerMap.set(worker.id, {
          workerId: worker.id,
          workerName: worker.name,
          postings: new Map(),
        });
      }
      const wg = workerMap.get(worker.id)!;

      const assignmentId = a.id as string;
      if (!wg.postings.has(assignmentId)) {
        wg.postings.set(assignmentId, {
          jobPostingId: jp.id,
          jobPostingTitle: jp.title,
          assignmentId,
          startDate: jp.start_date,
          endDate: jp.end_date,
          payType: effectivePayType,
          effectivePayRate,
          isOverridden,
          workDays: 0,
          totalHours: 0,
          subtotal: 0,
        });
      }
      const pg = wg.postings.get(assignmentId)!;
      // 0시간 기록은 미근무 — 일수/금액에서 제외 (통계용 시간만 누적)
      if (rec.work_hours > 0) {
        pg.workDays += 1;
        pg.totalHours += rec.work_hours;
        pg.subtotal += calculateAmount(
          effectivePayType,
          effectivePayRate,
          rec.work_hours
        );
      }
    }

    // 응답 형성
    let totalAmount = 0;
    let totalWorkHours = 0;
    let totalWorkDays = 0;

    const workers = Array.from(workerMap.values()).map((wg) => {
      const postings = Array.from(wg.postings.values());
      const workerTotal = postings.reduce((sum, p) => sum + p.subtotal, 0);
      const workerDays = postings.reduce((sum, p) => sum + p.workDays, 0);
      const workerHours = postings.reduce((sum, p) => sum + p.totalHours, 0);

      totalAmount += workerTotal;
      totalWorkDays += workerDays;
      totalWorkHours += workerHours;

      // posting level에서도 totalHours 반올림 (floating point 누적 오차 방지)
      const roundedPostings = postings.map((p) => ({
        ...p,
        totalHours: Math.round(p.totalHours * 10) / 10,
      }));

      return {
        workerId: wg.workerId,
        workerName: wg.workerName,
        totalAmount: workerTotal,
        totalWorkDays: workerDays,
        totalWorkHours: Math.round(workerHours * 10) / 10,
        postingCount: postings.length,
        postings: roundedPostings,
      };
    });

    // 금액 내림차순 정렬
    workers.sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      summary: {
        totalAmount,
        totalWorkers: workers.length,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalWorkDays,
      },
      workers,
    });
  } catch (error) {
    console.error("GET /api/cost-management error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost data" },
      { status: 500 }
    );
  }
}
