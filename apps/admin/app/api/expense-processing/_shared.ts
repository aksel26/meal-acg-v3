export const EXPENSE_PROCESSING_BUCKET = "expense-processing-workbooks";
export const EXPENSE_PROCESSING_BATCH_SELECT =
  "id, original_filename, row_count, created_at, updated_at, uploader:members!expense_processing_batches_uploaded_by_fkey(full_name)";

export function expenseProcessingBatch(row: any) {
  const uploader = Array.isArray(row.uploader)
    ? (row.uploader[0] ?? null)
    : (row.uploader ?? null);
  return {
    id: row.id,
    original_filename: row.original_filename,
    row_count: row.row_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    uploader,
  };
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
