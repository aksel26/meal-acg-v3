"use client";

import { useMutation } from "@tanstack/react-query";

export function useCostExport() {
  return useMutation<void, Error, { year: number; month: number }>({
    mutationFn: async ({ year, month }) => {
      const res = await fetch(
        `/api/cost-management/export?year=${year}&month=${month}`
      );
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `비용산정_${year}년${month}월.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
