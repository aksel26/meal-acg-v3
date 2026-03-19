"use client";

import { Download } from "lucide-react";
import { useCostExport } from "@/hooks/use-cost-export";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  year: number;
  month: number;
};

export function CostExportButton({ year, month }: Props) {
  const exportMutation = useCostExport();

  const handleExport = () => {
    exportMutation.mutate(
      { year, month },
      {
        onSuccess: () => toast.success("엑셀 파일이 다운로드되었습니다."),
        onError: () => toast.error("내보내기에 실패했습니다."),
      }
    );
  };

  return (
    <button
      onClick={handleExport}
      disabled={exportMutation.isPending}
      className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <Download size={16} />
      {exportMutation.isPending ? "내보내는 중..." : "엑셀 내보내기"}
    </button>
  );
}
