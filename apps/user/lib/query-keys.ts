/**
 * TanStack Query에서 사용할 Query Keys를 중앙 관리합니다.
 * 일관된 키 구조를 위해 factory pattern을 사용합니다.
 */

export const queryKeys = {
  // 계산 관련 쿼리
  calculation: {
    all: ["calculation"] as const,
    byUser: (userName: string) => ["calculation", userName] as const,
    byUserAndMonth: (userName: string, month: number, year?: number) => ["calculation", userName, month, year || new Date().getFullYear()] as const,
  },

  // 식사 데이터 관련 쿼리
  meals: {
    all: ["meals"] as const,
    byUser: (userName: string) => ["meals", userName] as const,
    byUserAndMonth: (userName: string, month: number, year: number) => ["meals", userName, month, year] as const,
    byUserAndDate: (userName: string, date: string) => ["meals", userName, "date", date] as const,
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
  },
} as const;

// 타입 유틸리티 함수들
export type QueryKey = typeof queryKeys;
