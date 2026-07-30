import { NextRequest, NextResponse } from "next/server";
import { getAdminAuditRequestContext } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import {
  EXPENSE_PROCESSING_MAX_FILE_SIZE,
  ExpenseProcessingWorkbookError,
  parseExpenseProcessingWorkbook,
} from "@/lib/expense-processing-workbook";
import { createServiceClient } from "@/lib/supabase/server";
import {
  EXPENSE_PROCESSING_BATCH_SELECT,
  EXPENSE_PROCESSING_BUCKET,
  expenseProcessingBatch,
} from "./_shared";

const client = () => createServiceClient() as any;
const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

class ExpenseProcessingInputError extends Error {}

function safeOriginalFilename(value: string) {
  const filename = (value.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!filename || !filename.toLowerCase().endsWith(".xlsx")) {
    throw new ExpenseProcessingInputError(".xlsx 파일만 업로드할 수 있습니다.");
  }
  return filename;
}

export async function GET() {
  try {
    await requireAdminPermission("expense_processing:read");
    const { data, error } = await client()
      .from("expense_processing_batches")
      .select(EXPENSE_PROCESSING_BATCH_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      batches: (data ?? []).map(expenseProcessingBatch),
    });
  } catch (error) {
    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    console.error("Expense processing batch list failed:", error);
    return NextResponse.json(
      { error: "비용처리 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let storagePath: string | null = null;
  try {
    const session = await requireAdminPermission("expense_processing:write");
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ExpenseProcessingInputError("업로드할 파일을 선택해주세요.");
    }
    const originalFilename = safeOriginalFilename(file.name);
    if (file.size === 0) {
      throw new ExpenseProcessingInputError("빈 파일은 업로드할 수 없습니다.");
    }
    if (file.size > EXPENSE_PROCESSING_MAX_FILE_SIZE) {
      throw new ExpenseProcessingInputError(
        "파일 크기는 최대 10 MiB까지 지원합니다.",
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseExpenseProcessingWorkbook(fileBuffer);
    storagePath = `${session.userId}/${crypto.randomUUID()}.xlsx`;
    const supabase = client();
    const { error: uploadError } = await supabase.storage
      .from(EXPENSE_PROCESSING_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: XLSX_CONTENT_TYPE,
      });
    if (uploadError) throw uploadError;

    const audit = getAdminAuditRequestContext(request);
    const { data, error } = await supabase.rpc(
      "create_expense_processing_batch",
      {
        p_batch: {
          original_filename: originalFilename,
          storage_path: storagePath,
          sheet_name: parsed.sheetName,
          header_row: parsed.headerRow,
        },
        p_rows: parsed.rows.map((row) => ({
          row_number: row.rowNumber,
          approval_date: row.approvalDate,
          user_name: row.userName,
          category: row.category,
          detail1: row.detail1,
          detail2: row.detail2,
          category_cell: row.categoryCell,
          detail1_cell: row.detail1Cell,
          detail2_cell: row.detail2Cell,
        })),
        p_actor_id: session.userId,
        p_request_path: audit.requestPath,
        p_ip_address: audit.ipAddress,
        p_user_agent: audit.userAgent,
      },
    );
    if (error) throw error;

    storagePath = null;
    return NextResponse.json(
      {
        batch: expenseProcessingBatch({
          ...data.batch,
          uploader: { full_name: session.fullName },
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (storagePath) {
      const { error: cleanupError } = await client()
        .storage.from(EXPENSE_PROCESSING_BUCKET)
        .remove([storagePath]);
      if (cleanupError) {
        console.error(
          "Expense processing upload cleanup failed:",
          cleanupError,
        );
      }
    }

    const status = getAuthErrorStatus(error);
    if (status) return NextResponse.json({ error: "Unauthorized" }, { status });
    if (
      error instanceof ExpenseProcessingInputError ||
      error instanceof ExpenseProcessingWorkbookError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Expense processing upload failed:", error);
    return NextResponse.json(
      { error: "비용처리 파일을 등록하지 못했습니다." },
      { status: 500 },
    );
  }
}
