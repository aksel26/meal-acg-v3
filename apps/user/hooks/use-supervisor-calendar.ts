import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface SupervisorPosting {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  type: "supervisor" | "interview";
}

interface SupervisorCalendarData {
  jobPostings: SupervisorPosting[];
  interviewPostings: SupervisorPosting[];
}

export function useSupervisorCalendarByMonth(year: number, month: number) {
  return useQuery<SupervisorCalendarData>({
    queryKey: queryKeys.supervisor.calendarByMonth(year, month),
    queryFn: async () => {
      const res = await fetch(
        `/api/supervisor/calendar?year=${year}&month=${month}`
      );
      if (!res.ok) throw new Error("Failed to fetch supervisor calendar");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

/** 공고 데이터를 날짜별 Map으로 변환 */
export function buildPostingsByDate(data: SupervisorCalendarData | undefined) {
  const map = new Map<string, SupervisorPosting[]>();
  if (!data) return map;

  const addToMap = (posting: SupervisorPosting) => {
    const start = new Date(posting.start_date);
    const end = new Date(posting.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0]!;
      const list = map.get(key) || [];
      list.push(posting);
      map.set(key, list);
    }
  };

  data.jobPostings.forEach(addToMap);
  data.interviewPostings.forEach(addToMap);

  return map;
}
