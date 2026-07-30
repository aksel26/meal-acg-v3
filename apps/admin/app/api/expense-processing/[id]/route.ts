import { NextRequest, NextResponse } from "next/server";
import { getAdminAuditRequestContext } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { EXPENSE_PROCESSING_MAX_ROWS } from "@/lib/expense-processing-workbook";
import { createServiceClient } from "@/lib/supabase/server";
import {
  EXPENSE_PROCESSING_BATCH_SELECT,
  expenseProcessingBatch,
  isUuid,
} from "../_shared";

const client = () => createServiceClient() as any;

type EditableRow = {
  id: string;
  category: string;
  detail1: string;
  detail2: string;
};

function editableRows(value: unknown): EditableRow[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > EXPENSE_PROCESSING_MAX_ROWS
  ) {
    return null;
  }
  const ids = new Set<string>();
  const rows: EditableRow[] = [];
  for (const row of value) {
    if (
      !row ||
      typeof row !== "object" ||
      !isUuid((row as EditableRow).id) ||
      typeof (row as EditableRow).category !== "string" ||
      typeof (row as EditableRow).detail1 !== "string" ||
      typeof (row as EditableRow).detail2 !== "string" ||
      (row as EditableRow).category.length > 2000 ||
      (row as EditableRow).detail1.length > 2000 ||
      (row as EditableRow).detail2.length > 2000 ||
      ids.has((row as EditableRow).id)
    ) {
      return null;
    }
    ids.add((row as EditableRow).id);
    rows.push(row as EditableRow);
  }
  return rows;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("expense_processing:read");
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "잘못된 배치 ID입니다." },
        { status: 400 },
      );
    }

    const supabase = client();
    const { data: batch, error: batchError } = await supabase
      .from("expense_processing_batches")
      .select(EXPENSE_PROCESSING_BATCH_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (batchError) throw batchError;
    if (!batch) {
      return NextResponse.json(
        { error: "비용처리 배치를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: rows, error: rowsError } = await supabase
      .from("expense_processing_rows")
      .select(
        "id, source_row, approval_date, user_name, category, detail1, detail2",
      )
      .eq("batch_id", id)
      .order("source_row");
    if (rowsError) throw rowsError;

    return NextResponse.json({
      batch: expenseProcessingBatch(batch),
      rows: (rows ?? []).map((row: any) => ({
        id: row.id,
        rowNumber: row.source_row,
        approvalDate: row.approval_date,
        userName: row.user_name,
        category: row.category,
        detail1: row.detail1,
        detail2: row.detail2,
      })),
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    console.error("Expense processing batch detail failed:", error);
    return NextResponse.json(
      { error: "비용처리 배치를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("expense_processing:write");
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "잘못된 배치 ID입니다." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { rows?: unknown };
    const rows = editableRows(body.rows);
    if (!rows) {
      return NextResponse.json(
        { error: "저장할 행 데이터를 확인해주세요." },
        { status: 400 },
      );
    }

    const audit = getAdminAuditRequestContext(request);
    const { data, error } = await client().rpc(
      "update_expense_processing_rows",
      {
        p_batch_id: id,
        p_rows: rows,
        p_actor_id: session.userId,
        p_request_path: audit.requestPath,
        p_ip_address: audit.ipAddress,
        p_user_agent: audit.userAgent,
      },
    );
    if (error) {
      if (error.code === "P0002") {
        return NextResponse.json(
          { error: "저장할 비용처리 행을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      throw error;
    }
    return NextResponse.json({
      success: true,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "요청 본문을 확인해주세요." },
        { status: 400 },
      );
    }
    console.error("Expense processing save failed:", error);
    return NextResponse.json(
      { error: "비용처리 내용을 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
