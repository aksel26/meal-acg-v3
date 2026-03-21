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
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]!;

    const supabase = createServiceClient();

    const [personnelRes, recordsRes] = await Promise.all([
      supabase.from("interview_personnel").select("*").eq("status", "active"),
      supabase
        .from("interview_work_records")
        .select("*")
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: true }),
    ]);

    if (personnelRes.error) throw personnelRes.error;
    if (recordsRes.error) throw recordsRes.error;

    const recordsByPersonnel = new Map<string, typeof recordsRes.data>();
    for (const rec of recordsRes.data ?? []) {
      const list = recordsByPersonnel.get(rec.personnel_id) ?? [];
      list.push(rec);
      recordsByPersonnel.set(rec.personnel_id, list);
    }

    const roleLabel: Record<string, string> = { rp: "RP", ft: "FT", instructor: "강사" };
    const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급", contract: "계약금" };

    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet("요약");
    summarySheet.columns = [
      { header: "이름", key: "name", width: 15 },
      { header: "역할", key: "role", width: 10 },
      { header: "연락처", key: "phone", width: 15 },
      { header: "은행", key: "bank", width: 12 },
      { header: "계좌번호", key: "account", width: 20 },
      { header: "급여유형", key: "payType", width: 12 },
      { header: "근무일수", key: "days", width: 12 },
      { header: "산정금액", key: "amount", width: 18 },
    ];

    for (const p of personnelRes.data ?? []) {
      const records = recordsByPersonnel.get(p.id) ?? [];
      let amount = 0;
      let days = 0;

      if (p.role === "rp") {
        for (const r of records) {
          if (r.work_hours > 0) {
            const rate = r.pay_rate_override ?? p.default_pay_rate ?? 0;
            const type = (r.pay_type_override ?? p.pay_type) as "hourly" | "daily";
            amount += calculateAmount(type, rate, r.work_hours);
            days += 1;
          }
        }
      } else {
        amount = p.contract_amount ?? 0;
      }

      if (amount === 0 && days === 0 && p.role === "rp") continue; // skip RP with no records

      summarySheet.addRow({
        name: p.name,
        role: roleLabel[p.role] ?? p.role,
        phone: p.phone,
        bank: p.bank_name,
        account: p.account_number,
        payType: payTypeLabel[p.pay_type] ?? p.pay_type,
        days: p.role === "rp" ? days : "-",
        amount,
      });
    }

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    // Detail sheet (RP work records only)
    const detailSheet = workbook.addWorksheet("상세 (RP)");
    detailSheet.columns = [
      { header: "이름", key: "name", width: 15 },
      { header: "날짜", key: "date", width: 12 },
      { header: "근무시간", key: "hours", width: 12 },
      { header: "급여타입", key: "payType", width: 10 },
      { header: "단가", key: "rate", width: 14 },
      { header: "금액", key: "amount", width: 14 },
      { header: "비고", key: "note", width: 20 },
    ];

    for (const p of personnelRes.data ?? []) {
      if (p.role !== "rp") continue;
      const records = recordsByPersonnel.get(p.id) ?? [];
      for (const r of records) {
        if (r.work_hours <= 0) continue;
        const rate = r.pay_rate_override ?? p.default_pay_rate ?? 0;
        const type = (r.pay_type_override ?? p.pay_type) as "hourly" | "daily";
        detailSheet.addRow({
          name: p.name,
          date: r.work_date,
          hours: r.work_hours,
          payType: payTypeLabel[type] ?? type,
          rate,
          amount: calculateAmount(type, rate, r.work_hours),
          note: r.note ?? "",
        });
      }
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `면접교육_정산_${year}년${month}월.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("GET /api/interview/settlement/export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
