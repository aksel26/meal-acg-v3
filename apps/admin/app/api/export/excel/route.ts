import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import ExcelJS from "exceljs";

// GET /api/export/excel - Export data to Excel
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const exportType = searchParams.get("type") || "summary";
    const includeFormulas = searchParams.get("formulas") === "true";

    // Fetch data
    const [statsResult, settingsResult, holidaysResult, mealLogsResult] = await Promise.all([
      supabase.rpc("get_user_monthly_stats", { p_year: year, p_month: month }),
      supabase.from("global_settings").select("*").eq("id", 1).single(),
      supabase
        .from("holidays")
        .select("*")
        .gte("holiday_date", `${year}-${month.toString().padStart(2, "0")}-01`)
        .lte("holiday_date", `${year}-${month.toString().padStart(2, "0")}-31`)
        .order("holiday_date"),
      exportType !== "summary"
        ? supabase
            .from("meal_logs")
            .select("*, members(full_name)")
            .gte("entry_date", `${year}-${month.toString().padStart(2, "0")}-01`)
            .lte("entry_date", `${year}-${month.toString().padStart(2, "0")}-31`)
            .order("entry_date")
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (statsResult.error || settingsResult.error || holidaysResult.error) {
      console.error("Error fetching data:", { statsResult, settingsResult, holidaysResult });
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const stats = statsResult.data || [];
    const settings = settingsResult.data;
    const holidays = holidaysResult.data || [];
    const mealLogs = mealLogsResult.data || [];

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ACG 식대 Admin";
    workbook.created = new Date();

    if (exportType === "raw") {
      // Raw data export
      const rawSheet = workbook.addWorksheet("RawData");
      rawSheet.columns = [
        { header: "ID", key: "id", width: 40 },
        { header: "사용자 ID", key: "user_id", width: 40 },
        { header: "이름", key: "full_name", width: 15 },
        { header: "날짜", key: "entry_date", width: 12 },
        { header: "근태", key: "attendance", width: 10 },
        { header: "아침_가게", key: "breakfast_store", width: 15 },
        { header: "아침_금액", key: "breakfast_amount", width: 12 },
        { header: "아침_결제자", key: "breakfast_payer", width: 12 },
        { header: "점심_가게", key: "lunch_store", width: 15 },
        { header: "점심_금액", key: "lunch_amount", width: 12 },
        { header: "점심_결제자", key: "lunch_payer", width: 12 },
        { header: "저녁_가게", key: "dinner_store", width: 15 },
        { header: "저녁_금액", key: "dinner_amount", width: 12 },
        { header: "저녁_결제자", key: "dinner_payer", width: 12 },
        { header: "총금액", key: "total_amount", width: 12 },
      ];

      mealLogs.forEach((log: any) => {
        rawSheet.addRow({
          id: log.id,
          user_id: log.user_id,
          full_name: log.members?.full_name || "",
          entry_date: log.entry_date,
          attendance: log.attendance,
          breakfast_store: log.breakfast_store,
          breakfast_amount: log.breakfast_amount,
          breakfast_payer: log.breakfast_payer,
          lunch_store: log.lunch_store,
          lunch_amount: log.lunch_amount,
          lunch_payer: log.lunch_payer,
          dinner_store: log.dinner_store,
          dinner_amount: log.dinner_amount,
          dinner_payer: log.dinner_payer,
          total_amount: log.total_amount,
        });
      });

      // Style header row
      rawSheet.getRow(1).font = { bold: true };
      rawSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    } else {
      // Summary sheet
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "#", key: "index", width: 5 },
        { header: "이름", key: "full_name", width: 15 },
        { header: "근무일수", key: "work_days", width: 10 },
        { header: "실제근무일", key: "actual_work_days", width: 12 },
        { header: "총 지원금", key: "total_allowance", width: 15 },
        { header: "사용 금액", key: "total_used", width: 15 },
        { header: "잔액", key: "balance", width: 15 },
        { header: "사용률", key: "usage_rate", width: 10 },
      ];

      stats.forEach((stat: any, index: number) => {
        const rowNum = index + 2;
        const row = summarySheet.addRow({
          index: index + 1,
          full_name: stat.full_name,
          work_days: stat.work_days,
          actual_work_days: stat.actual_work_days,
          total_allowance: includeFormulas
            ? { formula: `=Settings!$B$2*D${rowNum}` }
            : stat.total_allowance,
          total_used: stat.total_used,
          balance: includeFormulas
            ? { formula: `=E${rowNum}-F${rowNum}` }
            : stat.balance,
          usage_rate: stat.total_allowance
            ? `${((stat.total_used / stat.total_allowance) * 100).toFixed(1)}%`
            : "0%",
        });

        // Color balance cell based on value
        const balanceCell = row.getCell("balance");
        if (stat.balance < 0) {
          balanceCell.font = { color: { argb: "FFFF0000" } };
        } else {
          balanceCell.font = { color: { argb: "FF008000" } };
        }
      });

      // Style summary header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Format number columns
      summarySheet.getColumn("total_allowance").numFmt = "#,##0";
      summarySheet.getColumn("total_used").numFmt = "#,##0";
      summarySheet.getColumn("balance").numFmt = "#,##0";

      // Settings sheet
      const settingsSheet = workbook.addWorksheet("Settings");
      settingsSheet.columns = [
        { header: "설정", key: "setting", width: 20 },
        { header: "값", key: "value", width: 15 },
      ];

      settingsSheet.addRow({ setting: "일일 식대 단가", value: settings?.daily_allowance || 10000 });
      settingsSheet.addRow({ setting: "기준 연도", value: year });
      settingsSheet.addRow({ setting: "기준 월", value: month });
      settingsSheet.addRow({});
      settingsSheet.addRow({ setting: "공휴일 목록", value: "" });

      holidays.forEach((holiday: any) => {
        settingsSheet.addRow({ setting: holiday.holiday_date, value: holiday.description });
      });

      settingsSheet.getRow(1).font = { bold: true };
      settingsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Detailed export: add meal logs sheet
      if (exportType === "detailed" && mealLogs.length > 0) {
        const detailsSheet = workbook.addWorksheet("Details");
        detailsSheet.columns = [
          { header: "날짜", key: "entry_date", width: 12 },
          { header: "이름", key: "full_name", width: 15 },
          { header: "근태", key: "attendance", width: 10 },
          { header: "아침_가게", key: "breakfast_store", width: 15 },
          { header: "아침_금액", key: "breakfast_amount", width: 12 },
          { header: "점심_가게", key: "lunch_store", width: 15 },
          { header: "점심_금액", key: "lunch_amount", width: 12 },
          { header: "저녁_가게", key: "dinner_store", width: 15 },
          { header: "저녁_금액", key: "dinner_amount", width: 12 },
          { header: "총금액", key: "total_amount", width: 12 },
        ];

        mealLogs.forEach((log: any) => {
          detailsSheet.addRow({
            entry_date: log.entry_date,
            full_name: log.members?.full_name || "",
            attendance: log.attendance,
            breakfast_store: log.breakfast_store,
            breakfast_amount: log.breakfast_amount,
            lunch_store: log.lunch_store,
            lunch_amount: log.lunch_amount,
            dinner_store: log.dinner_store,
            dinner_amount: log.dinner_amount,
            total_amount: log.total_amount,
          });
        });

        detailsSheet.getRow(1).font = { bold: true };
        detailsSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        detailsSheet.getColumn("breakfast_amount").numFmt = "#,##0";
        detailsSheet.getColumn("lunch_amount").numFmt = "#,##0";
        detailsSheet.getColumn("dinner_amount").numFmt = "#,##0";
        detailsSheet.getColumn("total_amount").numFmt = "#,##0";
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="meal_${year}_${month}_${exportType}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
