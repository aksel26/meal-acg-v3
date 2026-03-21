import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/expense-reports/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.items !== undefined) {
      updateData.items = body.items;
      updateData.total_extra_cost = (body.items as { amount: number }[]).reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0
      );

      const { data: existing } = await supabase
        .from("interview_expense_reports")
        .select("total_labor_cost")
        .eq("id", id)
        .single();

      const laborCost = existing?.total_labor_cost ?? 0;
      updateData.grand_total = laborCost + (updateData.total_extra_cost as number);
    }

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/interview/expense-reports/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("interview_expense_reports")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/interview/expense-reports/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
