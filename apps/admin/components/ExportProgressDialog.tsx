"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Loader2,
  Check,
  X,
  Download,
  FileSpreadsheet,
  Archive,
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Progress } from "@repo/ui/src/progress";
import type { Member } from "@/lib/supabase/types";

type HalfYear = "H1" | "H2";

type MemberStatus = "pending" | "processing" | "completed" | "failed";

interface MemberExportState {
  memberId: string;
  fullName: string;
  status: MemberStatus;
  error?: string;
  blob?: Blob;
}

interface ExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  selectedMemberIds: string[];
  year: number;
  half: HalfYear;
}

export function ExportProgressDialog({
  open,
  onOpenChange,
  members,
  selectedMemberIds,
  year,
  half,
}: ExportProgressDialogProps) {
  const [exportStates, setExportStates] = useState<MemberExportState[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const hasStartedRef = useRef(false);

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedMemberIds.includes(m.id)),
    [members, selectedMemberIds]
  );
  const halfLabel = half === "H1" ? "상반기" : "하반기";

  // 진행률 계산
  const completedCount = exportStates.filter(
    (s) => s.status === "completed" || s.status === "failed"
  ).length;
  const progressValue =
    selectedMembers.length > 0 ? (completedCount / selectedMembers.length) * 100 : 0;

  // 순차 API 호출 실행
  const runExport = useCallback(async (membersToExport: Member[]) => {
    for (const member of membersToExport) {
      // 상태를 processing으로 업데이트
      setExportStates((prev) =>
        prev.map((s) =>
          s.memberId === member.id ? { ...s, status: "processing" } : s
        )
      );

      try {
        const params = new URLSearchParams({
          year: year.toString(),
          half,
          memberId: member.id,
        });

        const response = await fetch(`/api/export/member?${params}`);

        if (!response.ok) {
          throw new Error("Export failed");
        }

        const blob = await response.blob();

        // 성공 상태로 업데이트
        setExportStates((prev) =>
          prev.map((s) =>
            s.memberId === member.id
              ? { ...s, status: "completed", blob }
              : s
          )
        );
      } catch (error) {
        // 실패 상태로 업데이트
        setExportStates((prev) =>
          prev.map((s) =>
            s.memberId === member.id
              ? {
                  ...s,
                  status: "failed",
                  error: error instanceof Error ? error.message : "알 수 없는 오류",
                }
              : s
          )
        );
      }
    }

    setIsExporting(false);
    setIsCompleted(true);
  }, [year, half]);

  // 다이얼로그가 열릴 때 상태 초기화 및 export 시작
  useEffect(() => {
    if (open && !hasStartedRef.current) {
      hasStartedRef.current = true;
      // 초기 상태 설정
      const initialStates: MemberExportState[] = selectedMembers.map((m) => ({
        memberId: m.id,
        fullName: m.full_name,
        status: "pending",
      }));
      setExportStates(initialStates);
      setIsExporting(true);

      // export 실행
      runExport(selectedMembers);
    }

    // 다이얼로그가 닫히면 ref 초기화
    if (!open) {
      hasStartedRef.current = false;
    }
  }, [open, selectedMembers, runExport]);

  // 다운로드 처리
  const handleDownload = async () => {
    const successStates = exportStates.filter(
      (s) => s.status === "completed" && s.blob
    );

    if (successStates.length === 0) {
      toast.error("다운로드할 파일이 없습니다.");
      return;
    }

    if (successStates.length === 1) {
      // 1명: xlsx 직접 다운로드
      const state = successStates[0]!;
      const url = window.URL.createObjectURL(state.blob!);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.fullName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } else {
      // 2명 이상: JSZip으로 ZIP 생성
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const state of successStates) {
        zip.file(`${state.fullName}.xlsx`, state.blob!);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `식대내역_${year}년_${halfLabel}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ZIP 파일이 다운로드되었습니다.");
    }
  };

  // 다이얼로그 닫기
  const handleClose = () => {
    if (isExporting) {
      return; // 진행 중에는 닫기 방지
    }
    setExportStates([]);
    setIsExporting(false);
    setIsCompleted(false);
    onOpenChange(false);
  };

  const successCount = exportStates.filter((s) => s.status === "completed").length;
  const failedCount = exportStates.filter((s) => s.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            엑셀 내보내기
          </DialogTitle>
          <DialogDescription>
            {year}년 {halfLabel} 식대 내역을 내보내고 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">진행률</span>
              <span className="font-medium text-slate-900">
                {completedCount} / {selectedMembers.length}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Member list with status */}
          <div className="max-h-60 overflow-y-auto rounded-md">
            <div className="divide-y divide-slate-100">
              {exportStates.map((state) => (
                <div
                  key={state.memberId}
                  className="flex items-center justify-between p-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {state.fullName}
                  </span>
                  <StatusBadge status={state.status} error={state.error} />
                </div>
              ))}
            </div>
          </div>

          {/* Summary when completed */}
          {isCompleted && (
            <div className="rounded-md bg-slate-50 p-3">
              <div className="flex items-center gap-4 text-sm">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Check className="h-4 w-4" />
                    성공 {successCount}명
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <X className="h-4 w-4" />
                    실패 {failedCount}명
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            {isCompleted ? "닫기" : "취소"}
          </Button>
          {isCompleted && successCount > 0 && (
            <Button onClick={handleDownload} className="gap-2">
              {successCount === 1 ? (
                <>
                  <Download className="h-4 w-4" />
                  다운로드
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  ZIP 다운로드
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({
  status,
  error,
}: {
  status: MemberStatus;
  error?: string;
}) {
  switch (status) {
    case "pending":
      return (
        <span className="text-xs text-slate-400">
          대기 중
        </span>
      );
    case "processing":
      return (
        <span className="flex items-center gap-1 text-xs text-slate-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          처리 중
        </span>
      );
    case "completed":
      return (
        <span className="flex items-center gap-1 text-xs text-slate-600">
          <Check className="h-3.5 w-3.5" />
          완료
        </span>
      );
    case "failed":
      return (
        <span
          className="flex items-center gap-1 text-xs text-slate-600"
          title={error}
        >
          <X className="h-3.5 w-3.5" />
          실패
        </span>
      );
  }
}
