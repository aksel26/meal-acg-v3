import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// --- Types ---

export interface PointsMeResponse {
  id: string;
  full_name: string;
  member_role: string;
  team_name: string | null;
  division_name: string | null;
  organization_name: string | null;
}

export interface BudgetSummary {
  allocation_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  type: string;
  period: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
  usage_count: number;
  reviewed_count: number;
  team_name: string | null;
  division_name: string | null;
}

export interface UsageRecord {
  id: string;
  allocation_id: string;
  member_id: string;
  type: string;
  amount: number;
  description: string;
  used_at: string;
  companions: string[];
  co_payers: string[];
  receipt_url: string | null;
  notes: string | null;
  delay_reason: string | null;
  is_reviewed: boolean;
  review_status: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    member_role: string;
  };
}

export interface PointsDataResponse {
  summary: BudgetSummary | null;
  records: UsageRecord[];
}

export interface OrgMember {
  id: string;
  full_name: string;
  member_role: string;
  team_id: string | null;
  team_name: string | null;
}

export interface MemberLookup {
  id: string;
  full_name: string;
  member_role: string;
}

// --- Fetch Functions ---

async function fetchPointsMe(memberId: string): Promise<PointsMeResponse> {
  const params = new URLSearchParams({ member_id: memberId });
  const response = await fetch(`/api/points/me?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "내 정보를 가져오는데 실패했습니다.");
  }

  return data;
}

async function fetchPointsWelfare(
  memberId: string,
  period: string
): Promise<PointsDataResponse> {
  const params = new URLSearchParams({ member_id: memberId, period });
  const response = await fetch(`/api/points/welfare?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "복지포인트 데이터를 가져오는데 실패했습니다.");
  }

  return data;
}

async function fetchPointsActivity(
  memberId: string,
  period: string
): Promise<PointsDataResponse> {
  const params = new URLSearchParams({ member_id: memberId, period });
  const response = await fetch(`/api/points/activity?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "활동비 데이터를 가져오는데 실패했습니다.");
  }

  return data;
}

async function fetchPointsDashboard(
  memberId: string,
  period: string,
  type?: string
): Promise<BudgetSummary[]> {
  const params = new URLSearchParams({ member_id: memberId, period });
  if (type) {
    params.set("type", type);
  }
  const response = await fetch(`/api/points/dashboard?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "대시보드 데이터를 가져오는데 실패했습니다.");
  }

  return data;
}

async function fetchPointsMembers(memberId: string): Promise<OrgMember[]> {
  const params = new URLSearchParams({ member_id: memberId });
  const response = await fetch(`/api/points/members?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "멤버 목록을 가져오는데 실패했습니다.");
  }

  return data;
}

async function fetchMemberLookup(userName: string): Promise<MemberLookup> {
  const params = new URLSearchParams({ name: userName });
  const response = await fetch(`/api/points/lookup?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "멤버 조회에 실패했습니다.");
  }

  return data;
}

async function fetchAllocationRecords(
  memberId: string,
  allocationId: string,
  yearMonth?: string
): Promise<UsageRecord[]> {
  const params = new URLSearchParams({
    member_id: memberId,
    allocation_id: allocationId,
  });
  if (yearMonth) {
    params.set("year_month", yearMonth);
  }
  const response = await fetch(`/api/points/activity/records?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "사용내역을 가져오는데 실패했습니다.");
  }

  return data;
}

// --- Hooks ---

/**
 * 현재 사용자의 포인트 관련 정보 조회
 * - 역할(member_role) 확인으로 활동비 탭 표시 여부 결정에 사용
 */
export function usePointsMe(memberId: string | null) {
  return useQuery({
    queryKey: queryKeys.points.me,
    queryFn: () => fetchPointsMe(memberId!),
    enabled: !!memberId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  });
}

/**
 * 복지포인트 요약 및 사용내역 조회
 */
export function usePointsWelfare(memberId: string | null, period: string) {
  return useQuery({
    queryKey: queryKeys.points.welfare.byPeriod(memberId!, period),
    queryFn: () => fetchPointsWelfare(memberId!, period),
    enabled: !!memberId && !!period,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}

/**
 * 활동비 요약 및 사용내역 조회
 * - 팀장 이상만 데이터 반환 (서버에서 권한 체크)
 */
export function usePointsActivity(memberId: string | null, period: string) {
  return useQuery({
    queryKey: queryKeys.points.activity.byPeriod(memberId!, period),
    queryFn: () => fetchPointsActivity(memberId!, period),
    enabled: !!memberId && !!period,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}

/**
 * 조직 전체 예산 현황 조회 (대시보드용)
 * - 선택적 type 필터 지원 ('복지포인트' | '활동비')
 */
export function usePointsDashboard(
  memberId: string | null,
  period: string,
  type?: string
) {
  return useQuery({
    queryKey: queryKeys.points.dashboard.byPeriod(period, type),
    queryFn: () => fetchPointsDashboard(memberId!, period, type),
    enabled: !!memberId && !!period,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 2,
  });
}

/**
 * 같은 조직 멤버 목록 조회 (동반결제 인원 선택용)
 */
export function usePointsMembers(memberId: string | null) {
  return useQuery({
    queryKey: queryKeys.points.members,
    queryFn: () => fetchPointsMembers(memberId!),
    enabled: !!memberId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  });
}

/**
 * 사용자 이름(full_name)으로 Supabase member_id 조회
 * - 세션 중 변경되지 않으므로 staleTime: Infinity
 */
export function useMemberIdLookup(userName: string | null) {
  return useQuery({
    queryKey: ["points", "lookup", userName],
    queryFn: () => fetchMemberLookup(userName!),
    enabled: !!userName,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000, // 1시간
    retry: 2,
  });
}

/**
 * 특정 allocation의 사용내역 조회 (활동비 전체 조회용)
 * - 팀장/본부장만 조회 가능
 */
export function useAllocationRecords(
  memberId: string | null,
  allocationId: string | null,
  yearMonth?: string
) {
  return useQuery({
    queryKey: queryKeys.points.allocationRecords.byAllocation(
      memberId!,
      allocationId!,
      yearMonth
    ),
    queryFn: () =>
      fetchAllocationRecords(memberId!, allocationId!, yearMonth),
    enabled: !!memberId && !!allocationId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}
