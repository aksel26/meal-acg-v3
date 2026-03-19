import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year and month are required" },
        { status: 400 }
      );
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const supabase = createServiceClient();

    const { data: records, error } = await supabase
      .from("work_records")
      .select(
        `
        work_date, work_hours, note,
        assignment:assignments(
          id, pay_rate_override, pay_type_override, status,
          worker:workers(id, name, phone, bank_name, account_number),
          job_posting:job_postings(id, title, pay_rate, pay_type)
        )
      `
      )
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();

    // 데이터 집계
    type WorkerData = {
      name: string;
      phone: string | null;
      bankName: string | null;
      accountNumber: string | null;
      days: number;
      hours: number;
      amount: number;
      postingIds: Set<string>;
      details: {
        date: string;
        posting: string;
        hours: number;
        payType: string;
        rate: number;
        amount: number;
        note: string | null;
      }[];
    };
    const workerMap = new Map<string, WorkerData>();

    for (const rec of records ?? []) {
      const a = rec.assignment as unknown as Record<string, unknown>;
      if (!a || a.status === "cancelled") continue;
      const worker = a.worker as {
        id: string;
        name: string;
        phone: string | null;
        bank_name: string | null;
        account_number: string | null;
      } | null;
      const jp = a.job_posting as {
        id: string;
        title: string;
        pay_rate: number;
        pay_type: "hourly" | "daily";
      } | null;
      if (!worker || !jp) continue;

      const effectiveRate =
        (a.pay_rate_override as number | null) ?? jp.pay_rate;
      const effectiveType = ((a.pay_type_override as string | null) ??
        jp.pay_type) as "hourly" | "daily";
      const amt =
        rec.work_hours > 0
          ? calculateAmount(effectiveType, effectiveRate, rec.work_hours)
          : 0;

      if (!workerMap.has(worker.id)) {
        workerMap.set(worker.id, {
          name: worker.name,
          phone: worker.phone,
          bankName: worker.bank_name,
          accountNumber: worker.account_number,
          days: 0,
          hours: 0,
          amount: 0,
          postingIds: new Set(),
          details: [],
        });
      }
      const wd = workerMap.get(worker.id)!;
      if (rec.work_hours > 0) {
        wd.days += 1;
        wd.hours += rec.work_hours;
        wd.amount += amt;
      }
      wd.postingIds.add(jp.id);
      wd.details.push({
        date: rec.work_date,
        posting: jp.title,
        hours: rec.work_hours,
        payType: effectiveType === "hourly" ? "시급" : "일급",
        rate: effectiveRate,
        amount: amt,
        note: rec.note,
      });
    }

    // 요약 시트
    const summarySheet = workbook.addWorksheet("요약");
    summarySheet.columns = [
      { header: "지원자명", key: "name", width: 15 },
      { header: "연락처", key: "phone", width: 15 },
      { header: "은행", key: "bank", width: 12 },
      { header: "계좌번호", key: "account", width: 20 },
      { header: "참여 공고 수", key: "postings", width: 14 },
      { header: "근무 일수", key: "days", width: 12 },
      { header: "총 근무 시간", key: "hours", width: 14 },
      { header: "산정 금액", key: "amount", width: 18 },
    ];

    for (const wd of workerMap.values()) {
      summarySheet.addRow({
        name: wd.name,
        phone: wd.phone,
        bank: wd.bankName,
        account: wd.accountNumber,
        postings: wd.postingIds.size,
        days: wd.days,
        hours: Math.round(wd.hours * 10) / 10,
        amount: wd.amount,
      });
    }

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    // 상세 시트
    const detailSheet = workbook.addWorksheet("상세");
    detailSheet.columns = [
      { header: "지원자명", key: "name", width: 15 },
      { header: "날짜", key: "date", width: 12 },
      { header: "공고명", key: "posting", width: 25 },
      { header: "급여 타입", key: "payType", width: 10 },
      { header: "단가", key: "rate", width: 14 },
      { header: "근무 시간", key: "hours", width: 12 },
      { header: "금액", key: "amount", width: 14 },
      { header: "비고", key: "note", width: 20 },
    ];

    for (const wd of workerMap.values()) {
      for (const d of wd.details) {
        detailSheet.addRow({
          name: wd.name,
          date: d.date,
          posting: d.posting,
          payType: d.payType,
          rate: d.rate,
          hours: d.hours,
          amount: d.amount,
          note: d.note ?? "",
        });
      }
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    // 응답
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `비용산정_${year}년${month}월.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("GET /api/cost-management/export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
