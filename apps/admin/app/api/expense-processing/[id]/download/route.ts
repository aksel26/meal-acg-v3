import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { exportExpenseProcessingWorkbook } from "@/lib/expense-processing-workbook";
import { createServiceClient } from "@/lib/supabase/server";
import { EXPENSE_PROCESSING_BUCKET, isUuid } from "../../_shared";

const client = () => createServiceClient() as any;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("expense_processing:read");
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
      .select("id, original_filename, storage_path, sheet_name")
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
        "source_row, category, detail1, detail2, category_cell, detail1_cell, detail2_cell",
      )
      .eq("batch_id", id)
      .order("source_row");
    if (rowsError) throw rowsError;

    const { data: original, error: downloadError } = await supabase.storage
      .from(EXPENSE_PROCESSING_BUCKET)
      .download(batch.storage_path);
    if (downloadError || !original) throw downloadError;

    const output = exportExpenseProcessingWorkbook(
      Buffer.from(await original.arrayBuffer()),
      batch.sheet_name,
      (rows ?? []).map((row: any) => ({
        rowNumber: row.source_row,
        category: row.category,
        detail1: row.detail1,
        detail2: row.detail2,
        categoryCell: row.category_cell,
        detail1Cell: row.detail1_cell,
        detail2Cell: row.detail2_cell,
      })),
    );
    await writeAdminAuditLog({
      session,
      request,
      action: "expense_processing.download",
      targetType: "expense_processing_batch",
      targetId: id,
      targetLabel: batch.original_filename,
      riskLevel: "high",
    });

    return new NextResponse(output, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="expense-processing.xlsx"; filename*=UTF-8''${encodeURIComponent(batch.original_filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    console.error("Expense processing download failed:", error);
    return NextResponse.json(
      { error: "비용처리 파일을 내려받지 못했습니다." },
      { status: 500 },
    );
  }
}
