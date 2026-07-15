import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";

export interface MyAttendance {
  id: string;
  member_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  note: string | null;
}

export function useMyAttendanceToday() {
  return useQuery<MyAttendance | null>({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data ?? null;
    },
    refetchInterval: 60000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      toast.success("출근이 기록되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today });
      toast.success("퇴근이 기록되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
