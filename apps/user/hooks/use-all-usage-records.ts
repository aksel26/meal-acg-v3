import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// --- Types ---

export interface AllRecordItem {
  id: string;
  member_id: string;
  member_name: string;
  team_name: string | null;
  type: string;
  amount: number;
  description: string;
  used_at: string;
  is_reviewed: boolean;
  review_status: number;
  notes: string | null;
  delay_reason: string | null;
  created_at: string;
}

export interface AllRecordsResponse {
  records: AllRecordItem[];
  total_count: number;
  total_amount: number;
  has_more: boolean;
}

export interface AllRecordsFilters {
  memberId: string;
  period?: string;
  type?: string;
  filterMemberId?: string;
  reviewStatus?: string;
  limit?: number;
  offset?: number;
}

// --- Fetch Function ---

async function fetchAllUsageRecords(
  filters: AllRecordsFilters
): Promise<AllRecordsResponse> {
  const params = new URLSearchParams({ member_id: filters.memberId });
  if (filters.period) params.set("period", filters.period);
  if (filters.type) params.set("type", filters.type);
  if (filters.filterMemberId)
    params.set("filter_member_id", filters.filterMemberId);
  if (filters.reviewStatus) params.set("review_status", filters.reviewStatus);
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.offset) params.set("offset", filters.offset.toString());

  const response = await fetch(`/api/points/all-records?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "전체 내역을 가져오는데 실패했습니다.");
  }

  return data;
}

// --- Hook ---

/**
 * 조직 전체의 복지포인트/활동비 사용 내역 조회
 * - 필터: period, type, member, review_status
 * - 페이지네이션: limit + offset
 */
export function useAllUsageRecords(
  filters: AllRecordsFilters | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: filters ? queryKeys.points.allRecords.filtered(filters) : [],
    queryFn: () => fetchAllUsageRecords(filters!),
    enabled: !!filters && enabled,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}
