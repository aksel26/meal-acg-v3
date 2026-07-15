"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Badge } from "@repo/ui/src/badge";
import { Checkbox } from "@repo/ui/src/checkbox";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "@repo/ui/src/sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import {
  parsePointsExcelFile,
  type PointsUsageRow,
} from "@/lib/points-excel-parser";

interface Member {
  id: string;
  full_name: string;
}

type Step = "upload" | "preview" | "result";

interface ImportResult {
  success: boolean;
  inserted: number;
  failed: number;
  errors: string[];
  summary: string[];
}

interface ImportPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function typeBadgeStyle(type: string) {
  switch (type) {
    case "복지포인트":
      return "bg-slate-100/60 text-slate-800 border-transparent";
    case "활동비":
      return "bg-slate-50 text-slate-500 border-transparent";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export function ImportPointsDialog({
  open,
  onOpenChange,
}: ImportPointsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [parsedRows, setParsedRows] = useState<PointsUsageRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Members query (uses cached data from review page)
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  // NFC-normalized member name set
  const memberNameSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      set.add(m.full_name.normalize("NFC"));
      set.add(m.full_name.normalize("NFC").replace(/\s/g, ""));
    }
    return set;
  }, [members]);

  // Row status helper
  const getRowStatus = useCallback(
    (row: PointsUsageRow): "valid" | "error" | "no-member" => {
      if (row.validationErrors.length > 0) return "error";
      const normalized = row.name.normalize("NFC");
      if (
        !memberNameSet.has(normalized) &&
        !memberNameSet.has(normalized.replace(/\s/g, ""))
      ) {
        return "no-member";
      }
      return "valid";
    },
    [memberNameSet]
  );

  // Stats
  const stats = useMemo(() => {
    const valid = parsedRows.filter((r) => getRowStatus(r) === "valid").length;
    const error = parsedRows.filter((r) => getRowStatus(r) === "error").length;
    const noMember = parsedRows.filter((r) => getRowStatus(r) === "no-member").length;
    const selectedValid = [...selectedIndices].filter((i) => {
      const row = parsedRows[i];
      return row && getRowStatus(row) === "valid";
    }).length;
    return { valid, error, noMember, selectedValid, total: parsedRows.length };
  }, [parsedRows, selectedIndices, getRowStatus]);

  // File drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith(".xlsx")) {
        toast.error("xlsx 파일만 지원합니다.");
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const result = parsePointsExcelFile(buffer);

        if (!result.success) {
          toast.error(result.errors.join(", "));
          return;
        }

        setParsedRows(result.rows);
        setParseErrors(result.errors);

        // Auto-select all valid rows
        const validIndices = new Set<number>();
        result.rows.forEach((row, i) => {
          if (row.validationErrors.length === 0) {
            const normalized = row.name.normalize("NFC");
            if (
              memberNameSet.has(normalized) ||
              memberNameSet.has(normalized.replace(/\s/g, ""))
            ) {
              validIndices.add(i);
            }
          }
        });
        setSelectedIndices(validIndices);
        setStep("preview");
      } catch {
        toast.error("파일 읽기에 실패했습니다.");
      }
    },
    [memberNameSet]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  // Selection handlers
  const toggleRow = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const validIndices = parsedRows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => getRowStatus(row) === "valid")
      .map(({ i }) => i);

    const allSelected = validIndices.every((i) => selectedIndices.has(i));
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(validIndices));
    }
  };

  // Import handler
  const handleImport = async () => {
    if (stats.selectedValid === 0) return;
    if (!user?.id) {
      toast.error("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    setIsImporting(true);

    const selectedRows = [...selectedIndices]
      .sort((a, b) => a - b)
      .map((i) => parsedRows[i])
      .filter((row): row is PointsUsageRow => !!row && getRowStatus(row) === "valid");

    const records = selectedRows.map((row) => ({
      name: row.name,
      type: row.type,
      description: row.description,
      amount: row.amount,
      used_at: row.usedAt,
      notes: row.notes,
      pnc_check: row.pncCheck,
      no: row.no ?? null,
    }));

    try {
      const res = await fetch("/api/import/points-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      const result: ImportResult = await res.json();
      setImportResult(result);

      if (result.success) {
        toast.success(`${result.inserted}건 등록 완료`);
        // Invalidate related queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.usageRecords.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.budgetAllocations.all }),
          queryClient.invalidateQueries({ queryKey: ["pointsOverview"] }),
        ]);
      } else {
        toast.error("가져오기에 실패했습니다.");
      }

      setStep("result");
    } catch {
      toast.error("서버 오류가 발생했습니다.");
    } finally {
      setIsImporting(false);
    }
  };

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("upload");
      setParsedRows([]);
      setSelectedIndices(new Set());
      setImportResult(null);
      setParseErrors([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col" style={step !== "upload" ? { maxWidth: "48rem" } : undefined}>
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "엑셀 파일 가져오기"}
            {step === "preview" && "데이터 미리보기"}
            {step === "result" && "가져오기 결과"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Upload Step ── */}
        {step === "upload" && (
          <div className="py-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                isDragActive
                  ? "border-slate-500 bg-slate-100"
                  : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
              )}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              {isDragActive ? (
                <p className="text-slate-800 font-medium">파일을 여기에 놓으세요</p>
              ) : (
                <>
                  <p className="text-slate-600 font-medium">
                    클릭하거나 파일을 드래그하세요
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    .xlsx 파일만 지원됩니다
                  </p>
                </>
              )}
            </div>
            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">
                엑셀 컬럼 형식 (&quot;Raw data&quot; 시트)
              </p>
              <p className="text-xs text-slate-400">
                A: No. | B: 이름 | C: 연도 | D: 월 | E: 일 | F: 요일 | G: 유형(활동비/복지포인트) | H: 사유 | I: 금액 | J: P&C팀 확인
              </p>
            </div>
          </div>
        )}

        {/* ── Preview Step ── */}
        {step === "preview" && (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                onClick={() => {
                  setStep("upload");
                  setParsedRows([]);
                  setSelectedIndices(new Set());
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                다시 선택
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>전체 {stats.total}건</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">유효 {stats.valid}건</span>
                {stats.noMember > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">미매칭 {stats.noMember}건</span>
                  </>
                )}
                {stats.error > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">오류 {stats.error}건</span>
                  </>
                )}
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-xs font-medium text-slate-700">
                  파싱 경고: {parseErrors.join(", ")}
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-auto rounded-md">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="w-[36px] px-2 py-1.5 text-center">
                      <Checkbox
                        checked={
                          stats.valid > 0 &&
                          stats.selectedValid === stats.valid
                        }
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="w-[36px] px-1 py-1.5 text-center text-[11px] font-semibold text-slate-400">
                      No.
                    </th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-slate-500">
                      이름
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500">
                      날짜
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500">
                      유형
                    </th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-slate-500">
                      사용처
                    </th>
                    <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-slate-500">
                      금액
                    </th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-slate-500">
                      비고
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500">
                      P&C확인
                    </th>
                    <th className="w-[60px] px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 200).map((row, index) => {
                    const status = getRowStatus(row);
                    const isSelected = selectedIndices.has(index);
                    return (
                      <tr
                        key={index}
                        className={cn(
                          "transition-colors",
                          status === "error"
                            ? "bg-slate-50/50"
                            : status === "no-member"
                              ? "bg-slate-50/50"
                              : isSelected
                                ? "bg-slate-100/30"
                                : "hover:bg-slate-50/60"
                        )}
                      >
                        <td className="px-2 py-1 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(index)}
                            disabled={status !== "valid"}
                          />
                        </td>
                        <td className="px-1 py-1 text-center tabular-nums text-slate-400">
                          {row.rowIndex}
                        </td>
                        <td className="px-2 py-1 font-medium text-slate-900">
                          {row.name || "-"}
                        </td>
                        <td className="px-2 py-1 text-center tabular-nums text-slate-500">
                          {row.usedAt || "-"}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1 py-0",
                              typeBadgeStyle(row.type)
                            )}
                          >
                            {row.type}
                          </Badge>
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-1 text-slate-600">
                          {row.description || "-"}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums font-medium text-slate-900">
                          {row.amount > 0
                            ? row.amount.toLocaleString() + "원"
                            : "-"}
                        </td>
                        <td className="max-w-[120px] truncate px-2 py-1 text-slate-400">
                          {row.notes || "-"}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {row.pncCheck ? (
                            <span className="text-[10px] tabular-nums text-slate-600">
                              {row.pncCheck}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {status === "valid" ? (
                            <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-slate-500" />
                          ) : status === "no-member" ? (
                            <span title="멤버를 찾을 수 없습니다">
                              <AlertCircle className="mx-auto h-3.5 w-3.5 text-slate-500" />
                            </span>
                          ) : (
                            <span
                              title={row.validationErrors.join(", ")}
                            >
                              <XCircle className="mx-auto h-3.5 w-3.5 text-slate-500" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsedRows.length > 200 && (
                <div className="border-t border-slate-200 p-2 text-center text-xs text-slate-400">
                  처음 200건만 표시됩니다. 전체 {parsedRows.length}건
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleImport}
                disabled={stats.selectedValid === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-4 w-4" />
                    {stats.selectedValid}건 가져오기
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Result Step ── */}
        {step === "result" && importResult && (
          <>
            <div className="space-y-4 py-2">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-md border p-4",
                  importResult.success
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                {importResult.success ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                )}
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      importResult.success
                        ? "text-slate-700"
                        : "text-slate-700"
                    )}
                  >
                    {importResult.success
                      ? `${importResult.inserted}건 등록 완료`
                      : "가져오기 실패"}
                  </p>
                  {importResult.summary.map((s, i) => (
                    <p
                      key={i}
                      className={cn(
                        "mt-0.5 text-sm",
                        importResult.success
                          ? "text-slate-600"
                          : "text-slate-600"
                      )}
                    >
                      {s}
                    </p>
                  ))}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    오류 목록 ({importResult.errors.length}건)
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-xs text-slate-600">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>닫기</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
