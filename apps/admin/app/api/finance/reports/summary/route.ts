import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import { authErrorResponse } from "../../_utils";

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("finance:report");
    const supabase = createServiceClient();
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const [{ data: revenue, error: revenueError }, { data: expenses, error: expenseError }] =
      await Promise.all([
        supabase
          .from("finance_revenue_records")
          .select("amount, status, client:finance_clients(id, name), project:finance_projects(id, name)")
          .eq("revenue_month", month),
        supabase
          .from("finance_expense_records")
          .select("amount, status, project:finance_projects(id, name, client:finance_clients(id, name))")
          .gte("used_at", `${month}-01`)
          .lt("used_at", nextMonth(month)),
      ]);

    if (revenueError || expenseError) {
      console.error("Finance report summary error:", revenueError || expenseError);
      return NextResponse.json({ error: "정산 리포트 조회 실패" }, { status: 500 });
    }

    const totalRevenue = sum(revenue, ["expected", "invoiced", "paid"]);
    const paidRevenue = sum(revenue, ["paid"]);
    const receivable = sum(revenue, ["expected", "invoiced", "overdue"]);
    const totalExpenses = sum(expenses, ["submitted", "approved", "paid"]);
    const unpaidExpenses = sum(expenses, ["submitted", "approved"]);

    return NextResponse.json({
      month,
      totalRevenue,
      paidRevenue,
      receivable,
      totalExpenses,
      unpaidExpenses,
      margin: totalRevenue - totalExpenses,
      revenueCount: revenue?.length || 0,
      expenseCount: expenses?.length || 0,
      revenueByClient: groupRevenueByClient(revenue || []),
      profitByProject: groupProfitByProject(revenue || [], expenses || []),
    });
  } catch (error) {
    console.error("Finance report summary API error:", error);
    return authErrorResponse(error) || NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function nextMonth(month: string) {
  const [year = new Date().getFullYear(), monthNumber = new Date().getMonth() + 1] =
    month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return date.toISOString().slice(0, 10);
}

function sum(rows: any[] | null, statuses: string[]) {
  return (rows || [])
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + (row.amount || 0), 0);
}

function groupRevenueByClient(rows: any[]) {
  const map = new Map<string, { clientName: string; amount: number }>();
  rows.forEach((row) => {
    const id = row.client?.id || "none";
    const current = map.get(id) || { clientName: row.client?.name || "고객사 없음", amount: 0 };
    current.amount += row.amount || 0;
    map.set(id, current);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function groupProfitByProject(revenueRows: any[], expenseRows: any[]) {
  const map = new Map<string, { projectName: string; revenue: number; expenses: number; margin: number }>();

  revenueRows.forEach((row) => {
    const id = row.project?.id || "none";
    const current = map.get(id) || { projectName: row.project?.name || "프로젝트 없음", revenue: 0, expenses: 0, margin: 0 };
    current.revenue += row.amount || 0;
    current.margin = current.revenue - current.expenses;
    map.set(id, current);
  });

  expenseRows.forEach((row) => {
    const id = row.project?.id || "none";
    const current = map.get(id) || { projectName: row.project?.name || "프로젝트 없음", revenue: 0, expenses: 0, margin: 0 };
    current.expenses += row.amount || 0;
    current.margin = current.revenue - current.expenses;
    map.set(id, current);
  });

  return Array.from(map.values()).sort((a, b) => b.margin - a.margin);
}
