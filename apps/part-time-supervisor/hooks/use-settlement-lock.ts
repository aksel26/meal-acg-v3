import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SettlementLock } from "@/lib/supabase/types";

async function fetchSettlementLock(
  type: "supervisor" | "interview",
  year: number,
  month: number
): Promise<SettlementLock | null> {
  const res = await fetch(
    `/api/settlement-locks?type=${type}&year=${year}&month=${month}`
  );
  if (!res.ok) throw new Error("Failed to fetch settlement lock");
  return res.json();
}

async function createSettlementLock(body: {
  type: "supervisor" | "interview";
  year: number;
  month: number;
  memo?: string;
}): Promise<SettlementLock> {
  const res = await fetch("/api/settlement-locks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to create settlement lock");
  }
  return res.json();
}

async function deleteSettlementLock(id: string): Promise<void> {
  const res = await fetch(`/api/settlement-locks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete settlement lock");
}

export function useSettlementLock(
  type: "supervisor" | "interview",
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ["settlement-locks", type, year, month],
    queryFn: () => fetchSettlementLock(type, year, month),
  });
}

export function useLockSettlement(
  type: "supervisor" | "interview",
  year: number,
  month: number
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memo: string | undefined = undefined) =>
      createSettlementLock({ type, year, month, memo }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settlement-locks", type, year, month],
      });
    },
  });
}

export function useUnlockSettlement(
  type: "supervisor" | "interview",
  year: number,
  month: number
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSettlementLock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settlement-locks", type, year, month],
      });
    },
  });
}
