/**
 * TanStack Query에서 사용할 Query Keys를 중앙 관리합니다.
 * 일관된 키 구조를 위해 factory pattern을 사용합니다.
 */

export const queryKeys = {
  // 계산 관련 쿼리 (레거시 호환용)
  calculation: {
    all: ["calculation"] as const,
    byUser: (userName: string) => ["calculation", userName] as const,
    byUserAndMonth: (userName: string, month: number, year?: number) => ["calculation", userName, month, year || new Date().getFullYear()] as const,
  },

  // 식대 통계 쿼리 (신규)
  mealStats: {
    all: ["mealStats"] as const,
    byUser: (userId: string) => ["mealStats", userId] as const,
    byUserAndMonth: (userId: string, month: number, year?: number) => ["mealStats", userId, month, year || new Date().getFullYear()] as const,
  },

  // 식사 데이터 관련 쿼리
  meals: {
    all: ["meals"] as const,
    byUser: (userName: string) => ["meals", userName] as const,
    byUserAndMonth: (userName: string, month: number, year: number) => ["meals", userName, month, year] as const,
    byUserAndDate: (userName: string, date: string) => ["meals", userName, "date", date] as const,
    recentActivity: (excludeUserId?: string) => ["meals", "recentActivity", excludeUserId ?? "all"] as const,
  },

  // 파일 검증 관련 쿼리
  fileValidation: {
    all: ["fileValidation"] as const,
    byUser: (userName: string) => ["fileValidation", userName] as const,
    byUserAndMonth: (userName: string, month: number, year: number) => ["fileValidation", userName, month, year] as const,
  },

  // 사용자 목록 관련 쿼리
  users: {
    all: ["users"] as const,
    ids: ["users", "ids"] as const,
  },

  // 점심조 관련 쿼리
  lunchGroup: {
    all: ["lunchGroup"] as const,
    current: ["lunchGroup", "current"] as const,
    fixedSchedules: ["lunchGroup", "fixedSchedules"] as const,
  },

  // 전역 설정 관련 쿼리
  settings: {
    all: ["settings"] as const,
  },

  // 식당 관련 쿼리
  restaurants: {
    all: ["restaurants"] as const,
    list: ["restaurants", "list"] as const,
  },

  // 월간 음료 신청 관련 쿼리
  monthly: {
    all: ["monthly"] as const,
    data: ["monthly", "data"] as const,
    collections: ["monthly", "collections"] as const,
    collection: (id: string) => ["monthly", "collection", id] as const,
  },

  // 포인트 관련 쿼리 (Supabase 기반)
  points: {
    all: ["points"] as const,
    welfare: {
      all: ["points", "welfare"] as const,
      byPeriod: (memberId: string, period: string) =>
        ["points", "welfare", memberId, period] as const,
    },
    activity: {
      all: ["points", "activity"] as const,
      byPeriod: (memberId: string, period: string) =>
        ["points", "activity", memberId, period] as const,
    },
    dashboard: {
      all: ["points", "dashboard"] as const,
      byPeriod: (period: string, type?: string) =>
        ["points", "dashboard", period, type ?? "all"] as const,
    },
    allocationRecords: {
      byAllocation: (
        memberId: string,
        allocationId: string,
        yearMonth?: string
      ) =>
        [
          "points",
          "allocationRecords",
          memberId,
          allocationId,
          yearMonth ?? "all",
        ] as const,
    },
    allRecords: {
      all: ["points", "allRecords"] as const,
      filtered: (filters: {
        memberId: string;
        period?: string;
        type?: string;
        filterMemberId?: string;
        reviewStatus?: string;
        limit?: number;
        offset?: number;
      }) => ["points", "allRecords", filters] as const,
    },
    me: ["points", "me"] as const,
    members: ["points", "members"] as const,
  },
} as const;

// 타입 유틸리티 함수들
export type QueryKey = typeof queryKeys;
