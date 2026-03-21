import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import ExcelJS from "exceljs";

const roleLabel: Record<string, string> = {
  ft: "FT",
  rp: "RP",
  instructor: "강사",
  other: "기타",
};

const payTypeLabel: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // 공고 정보
    const { data: job, error: jobError } = await supabase
      .from("interview_job_postings")
      .select("*")
      .eq("id", id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job posting not found" },
        { status: 404 },
      );
    }

    // 배정 목록 + 인력 정보
    const { data: assignments, error: assignError } = await supabase
      .from("interview_job_assignments")
      .select("*")
      .eq("job_posting_id", id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (assignError) throw assignError;

    const personnelIds = [
      ...new Set((assignments ?? []).map((a) => a.personnel_id)),
    ];
    let personnelMap: Record<string, Record<string, unknown>> = {};

    if (personnelIds.length > 0) {
      const { data: personnel } = await supabase
        .from("interview_personnel")
        .select("*")
        .in("id", personnelIds);

      personnelMap = (personnel ?? []).reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, Record<string, unknown>>,
      );
    }

    // Excel 생성
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("인원 명단");

    ws.columns = [
      { header: "이름", key: "name", width: 12 },
      { header: "역할", key: "role", width: 8 },
      { header: "연락처", key: "phone", width: 16 },
      { header: "은행", key: "bank", width: 10 },
      { header: "계좌번호", key: "account", width: 20 },
      { header: "급여유형", key: "payType", width: 8 },
      { header: "급여", key: "payRate", width: 12 },
      { header: "근무시간", key: "workHours", width: 10 },
      { header: "메모", key: "note", width: 20 },
    ];

    // 헤더 스타일
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };

    // 역할별 정렬
    const roleOrder: Record<string, number> = {
      ft: 0,
      rp: 1,
      instructor: 2,
      other: 3,
    };

    const sorted = [...(assignments ?? [])].sort((a, b) => {
      const pa = personnelMap[a.personnel_id];
      const pb = personnelMap[b.personnel_id];
      const ra = roleOrder[(pa?.role as string) || "other"] ?? 99;
      const rb = roleOrder[(pb?.role as string) || "other"] ?? 99;
      return ra - rb;
    });

    for (const a of sorted) {
      const p = personnelMap[a.personnel_id];
      ws.addRow({
        name: (p?.name as string) || "-",
        role: roleLabel[(p?.role as string) || "other"] || "-",
        phone: (p?.phone as string) || "-",
        bank: (p?.bank_name as string) || "-",
        account: (p?.account_number as string) || "-",
        payType: payTypeLabel[a.pay_type] || a.pay_type,
        payRate: a.pay_rate,
        workHours: a.work_hours || "-",
        note: a.note || "",
      });
    }

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`면접교육_${job.title}_명단.xlsx`)}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 },
    );
  }
}
