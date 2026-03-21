"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function SettlementExportButton({ year, month }: { year: number; month: number }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/interview/settlement/export?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `면접교육_정산_${year}년${month}월.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      <Download size={16} />
      {isLoading ? "내보내는 중..." : "Excel"}
    </button>
  );
}
