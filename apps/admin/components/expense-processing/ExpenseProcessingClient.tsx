"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "@repo/ui/src/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import {
  OperationsPage,
  OperationsSection,
  operationButtonClass,
  operationSecondaryButtonClass,
} from "@repo/ui/src/operations";
import { Download, FileSpreadsheet, Loader2, Save, Upload } from "lucide-react";

type ExpenseBatch = {
  id: string;
  original_filename: string;
  row_count: number;
  created_at: string;
  updated_at: string;
  uploader?: { full_name: string } | null;
};

type ExpenseRow = {
  id: string;
  rowNumber: number;
  approvalDate: string;
  userName: string;
  category: string;
  detail1: string;
  detail2: string;
};

type BatchDetail = {
  batch: ExpenseBatch;
  rows: ExpenseRow[];
};

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "요청에 실패했습니다.");
  return payload;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ExpenseProcessingClient() {
  const [batches, setBatches] = useState<ExpenseBatch[]>([]);
  const [selected, setSelected] = useState<BatchDetail | null>(null);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadBatches = useCallback(async () => {
    const data = await requestJson<{ batches: ExpenseBatch[] }>(
      "/api/expense-processing",
    );
    setBatches(data.batches);
  }, []);

  useEffect(() => {
    loadBatches()
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "비용처리 작업을 불러오지 못했습니다.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadBatches]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    const warnLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        link.target === "_blank" ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (!window.confirm("저장하지 않은 변경사항을 버리고 이동할까요?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", warnLink, true);
    };
  }, [dirty]);

  const openBatch = useCallback(
    async (id: string, skipConfirm = false) => {
      if (
        dirty &&
        !skipConfirm &&
        !window.confirm("저장하지 않은 변경사항을 버리고 이동할까요?")
      ) {
        return;
      }
      try {
        const detail = await requestJson<BatchDetail>(
          `/api/expense-processing/${id}`,
        );
        setSelected(detail);
        setRows(detail.rows);
        setDirty(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "비용처리 작업을 열지 못했습니다.",
        );
      }
    },
    [dirty],
  );

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (
        dirty &&
        !window.confirm("저장하지 않은 변경사항을 버리고 새 작업을 열까요?")
      ) {
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const data = await requestJson<{ batch: ExpenseBatch }>(
          "/api/expense-processing",
          { method: "POST", body: formData },
        );
        await loadBatches();
        await openBatch(data.batch.id, true);
        toast.success("비용처리 Excel을 등록했습니다.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "업로드하지 못했습니다.",
        );
      } finally {
        setUploading(false);
      }
    },
    [dirty, loadBatches, openBatch],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
    onDropRejected: () =>
      toast.error("10MB 이하의 .xlsx 파일 한 개만 업로드할 수 있습니다."),
  });

  function updateRow(
    id: string,
    field: "category" | "detail1" | "detail2",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
    setDirty(true);
  }

  async function save() {
    if (!selected || !dirty) return;
    setSaving(true);
    try {
      const result = await requestJson<{ updatedAt: string }>(
        `/api/expense-processing/${selected.batch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: rows.map(({ id, category, detail1, detail2 }) => ({
              id,
              category,
              detail1,
              detail2,
            })),
          }),
        },
      );
      setSelected((current) =>
        current
          ? {
              ...current,
              batch: { ...current.batch, updated_at: result.updatedAt },
            }
          : current,
      );
      setBatches((current) =>
        current.map((batch) =>
          batch.id === selected.batch.id
            ? { ...batch, updated_at: result.updatedAt }
            : batch,
        ),
      );
      setDirty(false);
      toast.success("작성 내용을 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  function download() {
    if (!selected) return;
    if (dirty) {
      toast.error("변경사항을 저장한 후 다운로드해주세요.");
      return;
    }
    window.location.href = `/api/expense-processing/${selected.batch.id}/download`;
  }

  return (
    <OperationsPage
      variant="admin"
      title="비용처리"
      description="외부 Excel 양식을 업로드하고 비용 상세내역을 작성합니다."
    >
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <OperationsSection
            title="Excel 업로드"
            description=".xlsx 파일 한 개를 새 작업으로 등록합니다."
          >
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border border-dashed p-6 text-center transition ${
                isDragActive
                  ? "border-slate-500 bg-slate-50"
                  : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <Loader2 className="mx-auto size-8 animate-spin text-slate-500" />
              ) : (
                <Upload className="mx-auto size-8 text-slate-400" />
              )}
              <p className="mt-3 text-sm font-medium text-slate-700">
                {uploading
                  ? "업로드하는 중입니다"
                  : "클릭하거나 파일을 드래그하세요"}
              </p>
              <p className="mt-1 text-xs text-slate-400">최대 10MB · .xlsx</p>
            </div>
          </OperationsSection>

          <OperationsSection
            title="작성 작업"
            description="업로드별로 저장된 작업을 다시 열 수 있습니다."
          >
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : batches.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                등록된 작업이 없습니다.
              </p>
            ) : (
              <div className="max-h-[480px] space-y-2 overflow-y-auto">
                {batches.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    aria-current={selected?.batch.id === batch.id}
                    onClick={() => openBatch(batch.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selected?.batch.id === batch.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <FileSpreadsheet className="size-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {batch.original_filename}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-400">
                      {batch.row_count.toLocaleString()}행 ·{" "}
                      {formatDateTime(batch.updated_at)}
                    </span>
                    {batch.uploader?.full_name && (
                      <span className="mt-1 block text-xs text-slate-400">
                        {batch.uploader.full_name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </OperationsSection>
        </div>

        <OperationsSection
          title={
            selected?.batch.original_filename ?? "작성할 작업을 선택하세요"
          }
          description={
            selected
              ? `승인일과 이용자명은 원본 값이며 나머지 세 항목만 작성합니다.`
              : "왼쪽 목록에서 기존 작업을 열거나 Excel 파일을 업로드하세요."
          }
        >
          {!selected ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-400">
              선택된 작업이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {rows.length.toLocaleString()}행 · 최근 저장{" "}
                  {formatDateTime(selected.batch.updated_at)}
                  {dirty && (
                    <span className="ml-2 font-medium text-slate-700">
                      저장되지 않은 변경사항
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={download}
                    className={operationSecondaryButtonClass}
                  >
                    <Download className="mr-1.5 size-4" />
                    XLSX 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className={operationButtonClass}
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 size-4" />
                    )}
                    저장
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-250px)] overflow-auto rounded-lg border border-slate-200">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-slate-50">
                    <TableRow>
                      <TableHead className="w-14 text-center">행</TableHead>
                      <TableHead className="w-32">승인일</TableHead>
                      <TableHead className="w-32">이용자명</TableHead>
                      <TableHead className="w-44">구분</TableHead>
                      <TableHead>상세내역1</TableHead>
                      <TableHead>상세내역2(식당이름)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center text-xs text-slate-400">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-slate-50/70 text-slate-600">
                          {row.approvalDate}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-slate-50/70 font-medium text-slate-700">
                          {row.userName}
                        </TableCell>
                        <EditableCell
                          label={`${row.rowNumber}행 구분`}
                          value={row.category}
                          onChange={(value) =>
                            updateRow(row.id, "category", value)
                          }
                        />
                        <EditableCell
                          label={`${row.rowNumber}행 상세내역1`}
                          value={row.detail1}
                          onChange={(value) =>
                            updateRow(row.id, "detail1", value)
                          }
                        />
                        <EditableCell
                          label={`${row.rowNumber}행 상세내역2`}
                          value={row.detail2}
                          onChange={(value) =>
                            updateRow(row.id, "detail2", value)
                          }
                        />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </OperationsSection>
      </div>
    </OperationsPage>
  );
}

function EditableCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className="p-0">
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-36 border-0 bg-transparent px-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-slate-900/20"
      />
    </TableCell>
  );
}
