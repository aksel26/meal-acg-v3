import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface AttendanceRecord {
  id: string;
  member_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  note: string | null;
  member: {
    id: string;
    full_name: string;
    position: { name: string } | null;
  };
}

export interface AttendanceTodaySummary {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  late: number;
  onLeave: number;
  lateMembers: { id: string; name: string }[];
  notCheckedInMembers: { id: string; name: string }[];
}

export function useAttendanceByMonth(year: number, month: number) {
  return useQuery<AttendanceRecord[]>({
    queryKey: queryKeys.attendance.byMonth(year, month),
    queryFn: async () => {
      const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });
}

export function useAttendanceToday() {
  return useQuery<AttendanceTodaySummary>({
    queryKey: queryKeys.attendance.today,
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      if (!res.ok) throw new Error("Failed to fetch today attendance");
      return res.json();
    },
    refetchInterval: 60000, // 1분마다 새로고침
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success("출퇴근 기록이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
