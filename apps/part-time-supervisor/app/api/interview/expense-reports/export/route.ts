import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const jobPostingId = searchParams.get("job_posting_id");

    if (!jobPostingId) {
      return NextResponse.json({ error: "job_posting_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch expense report
    const { data: report, error: reportError } = await supabase
      .from("interview_expense_reports")
      .select("*")
      .eq("job_posting_id", jobPostingId)
      .maybeSingle();

    if (reportError) throw reportError;
    if (!report) {
      return NextResponse.json({ error: "Expense report not found" }, { status: 404 });
    }

    // Fetch assignments for labor cost breakdown
    const { data: assignments, error: assignError } = await supabase
      .from("interview_job_assignments")
      .select("*, interview_personnel(name, role, bank_name, account_number)")
      .eq("job_posting_id", jobPostingId)
      .neq("status", "cancelled");

    if (assignError) throw assignError;

    const roleLabel: Record<string, string> = { rp: "RP", ft: "FT", instructor: "강사" };
    const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급", contract: "계약금" };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("지출결의서");

    // Title
    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = report.title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    // Empty row
    sheet.addRow([]);

    // Section 1: 인건비
    const laborHeaderRow = sheet.addRow(["[인건비]"]);
    laborHeaderRow.getCell(1).font = { bold: true, size: 11 };

    const laborColRow = sheet.addRow(["번호", "이름", "역할", "급여유형", "금액"]);
    laborColRow.font = { bold: true };
    laborColRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    let laborTotal = 0;
    (assignments ?? []).forEach((a, i) => {
      const personnel = a.interview_personnel as { name: string; role: string } | null;
      const payType = (a.pay_type ?? "daily") as "hourly" | "daily";
      const amount = calculateAmount(payType, a.pay_rate ?? 0, a.work_hours ?? 0);
      laborTotal += amount;

      sheet.addRow([
        i + 1,
        personnel?.name ?? "-",
        roleLabel[personnel?.role ?? ""] ?? personnel?.role ?? "-",
        payTypeLabel[payType] ?? payType,
        amount,
      ]);
    });

    const laborTotalRow = sheet.addRow(["", "", "", "소계", laborTotal]);
    laborTotalRow.font = { bold: true };

    // Empty row
    sheet.addRow([]);

    // Section 2: 추가 비용
    const extraHeaderRow = sheet.addRow(["[추가 비용]"]);
    extraHeaderRow.getCell(1).font = { bold: true, size: 11 };

    const extraColRow = sheet.addRow(["번호", "항목명", "금액", "비고"]);
    extraColRow.font = { bold: true };
    extraColRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    const items = (report.items ?? []) as { name: string; amount: number; note?: string }[];
    let extraTotal = 0;
    items.forEach((item, i) => {
      extraTotal += item.amount ?? 0;
      sheet.addRow([i + 1, item.name, item.amount ?? 0, item.note ?? ""]);
    });

    const extraTotalRow = sheet.addRow(["", "소계", extraTotal]);
    extraTotalRow.font = { bold: true };

    // Empty row
    sheet.addRow([]);

    // Grand total
    const grandTotalRow = sheet.addRow(["", "", "", "합계", laborTotal + extraTotal]);
    grandTotalRow.font = { bold: true, size: 12 };
    grandTotalRow.getCell(5).numFmt = "#,##0";

    // Column widths
    sheet.getColumn(1).width = 8;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 14;
    sheet.getColumn(4).width = 14;
    sheet.getColumn(5).width = 18;

    // Number format for amount columns
    sheet.eachRow((row) => {
      const cell5 = row.getCell(5);
      if (typeof cell5.value === "number") {
        cell5.numFmt = "#,##0";
      }
      const cell3 = row.getCell(3);
      if (typeof cell3.value === "number") {
        cell3.numFmt = "#,##0";
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${report.title}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("GET /api/interview/expense-reports/export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
