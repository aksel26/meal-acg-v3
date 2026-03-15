# Part-Time Supervisor 대시보드 리디자인 설계

## 개요

기존 대시보드(단순 카운트 + 최근 공고 리스트)를 완전히 교체하여, 날짜 범위 기준으로 공고별 종합 현황(출석/계약/회의실 배정)을 상세히 볼 수 있는 대시보드를 구축한다.

## 목표

- 아침에 출근해서 오늘/이번 주 전체 현황을 한눈에 파악
- 특정 날짜의 문제(미출석, 미서명 등)를 빠르게 찾아 조치

## 레이아웃: 그리드 + 확장 패널

### 상단 영역
- **날짜 범위 선택**: DateRangePicker 컴포넌트
- **프리셋 버튼**: "오늘" / "이번 주" / "이번 달"
  - 오늘: 오늘 ~ 오늘
  - 이번 주: 월요일 ~ 일요일
  - 이번 달: 1일 ~ 말일
  - 페이지 초기 로드 기본값: "오늘"

### 요약 통계 바 (4개 카드)
| 통계 | 설명 | 색상 기준 |
|------|------|----------|
| 진행 중 공고 | 해당 기간 내 활성 공고 수 | 없음 (흰색 숫자) |
| 총 배정 인원 | 전체 배정된 인원 합계 | 없음 (흰색 숫자) |
| 출석 완료 | `attendanceConfirmed` 인원 / 총 배정 | 비율별 색상 (숫자 텍스트) |
| 계약 완료 | `contractConfirmed` 인원 / 총 배정 | 비율별 색상 (숫자 텍스트) |

### 공고별 그리드
- 반응형: `grid-cols-1 md:grid-cols-2`
- 각 공고가 카드로 표시
- 카드 내용: 공고 제목, 기간, 장소, 시간, 상태 배지
- 미니 통계 3칸: 배정 (`{assigned}/{headcount}`) / 출석 현황 / 계약 현황
- 미니 통계 숫자에 비율별 색상 적용 (텍스트 색상)
- **문제 카드**: 빨간 테두리 + 하단 경고 메시지

### 확장 패널
- 카드 클릭 시 **해당 카드가 포함된 행 아래에 전체 너비로 표시**
- 한 번에 하나만 확장 (다른 카드 클릭 시 이전 패널 닫힘)
- 3개 탭: 출석 / 계약 / 회의실

#### 출석 탭
| 컬럼 | 내용 |
|------|------|
| 이름 | 인력 이름 |
| 연락처 | 전화번호 |
| 출석 상태 | 미출석 / 출석(확인대기) / 출석확인완료 |
| 계약 상태 | 미서명 / 서명완료 / 확인완료 |
| 회의실 | 배정된 방 + 시간대 (없으면 "미배정") |

#### 계약 탭
- 동일 테이블 구조, 계약 상태 중심으로 정렬

#### 회의실 탭
- 회의실별 그룹핑 (C1, C2, R, G, 406-1, 406-2, 16층)
- 각 회의실 아래 배정 인원 + 시간대 표시
- 배정 없는 방은 미표시
- 미배정 인원 별도 섹션
- 읽기 전용 (편집은 room-assignments 페이지에서)

### 빈 상태(Empty States)
- 선택 기간에 공고 없음: "선택한 기간에 해당하는 공고가 없습니다." (중앙 배치)
- 공고에 배정 인원 없음: 카드에 "배정 인원 없음" 표시 (muted 텍스트)
- 확장 패널 데이터 없음: "배정된 인원이 없습니다."

## 용어 정의

### 출석 상태 매핑
| `attendance_status` 값 | UI 표시 | 분류 |
|------------------------|---------|------|
| `null` | 미출석 | **미출석** |
| `"checked_in"` | 출석(확인대기) | 출석 (미확인) |
| `"confirmed"` | 출석확인완료 | **출석 완료** |

### 계약 상태 매핑
| `contract_status` 값 | UI 표시 | 분류 |
|----------------------|---------|------|
| `null` | 미서명 | **미계약** |
| `"signed"` | 서명완료 | 서명 (미확인) |
| `"confirmed"` | 확인완료 | **계약 완료** |

### 통계 정의
- **출석 완료** (summary, 미니 통계): `attendance_status === "confirmed"`인 인원 수
- **계약 완료** (summary, 미니 통계): `contract_status === "confirmed"`인 인원 수
- **미출석** (문제 감지): `attendance_status === null`인 인원 수
- **미계약** (문제 감지): `contract_status === null`인 인원 수

## 문제 감지 로직

### 판별 기준
- 미출석(`attendance_status === null`) 인원이 배정 인원의 **50% 이상** → `hasIssues: true`
- 미계약(`contract_status === null`) 인원이 배정 인원의 **50% 이상** → `hasIssues: true`
- 둘 중 하나라도 해당하면 문제 카드로 표시
- 배정 인원이 0명이면 문제 카드가 아님

### 시각적 처리
- 정상 카드: 기본 테두리
- 문제 카드: `border-red-500` + "⚠ 미출석 N명 · 미계약 N명" 경고
- 비율별 색상 (출석/계약 숫자 텍스트에 적용):
  - 80% 이상: 초록 (`text-green-400`)
  - 50~80%: 노랑 (`text-yellow-400`)
  - 50% 미만: 빨강 (`text-red-400`)

## API 설계

### `GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

기존 `/api/dashboard`를 완전 교체.

**응답:**
```typescript
{
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;  // confirmed 인원 수
    contractCompleted: number;    // confirmed 인원 수
  };
  jobPostings: Array<{
    id: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    workStart: string;
    workEnd: string;
    status: string;
    headcount: number;
    workers: Array<{
      id: string;           // assignment id
      workerId: string;
      name: string;
      phone: string;
      attendanceStatus: "checked_in" | "confirmed" | null;
      contractStatus: "signed" | "confirmed" | null;
      roomSlots: RoomSlot[] | null;
    }>;
    stats: {
      assigned: number;
      attendanceCheckedIn: number;   // checked_in 인원
      attendanceConfirmed: number;   // confirmed 인원
      contractSigned: number;        // signed 인원
      contractConfirmed: number;     // confirmed 인원
    };
    hasIssues: boolean;
  }>;
}
```

### 데이터 조합 로직

**단일 쿼리로 처리** (N+1 방지):
```typescript
// Supabase nested select로 한 번에 조회 (LEFT JOIN으로 배정 없는 공고도 포함)
const { data: jobPostings } = await supabase
  .schema("supervisor")
  .from("job_postings")
  .select(`
    *,
    assignments(
      id, attendance_status, contract_status, room_slots, status,
      worker:workers(id, name, phone)
    )
  `)
  .in("status", ["open", "in_progress"])
  .lte("start_date", endDate)
  .gte("end_date", startDate);

// 서버에서 cancelled assignments 필터링 + stats 계산
```

> **주의:** `!inner` 대신 기본 LEFT JOIN을 사용하여 배정 인원이 없는 공고도 결과에 포함한다. `cancelled` assignment 필터링은 서버 코드에서 처리한다.

**필터링 기준:**
- 공고 상태: `open` 또는 `in_progress`만 포함 (`draft`, `closed`, `completed` 제외)
- 날짜 겹침: `job_posting.start_date <= query.end_date AND job_posting.end_date >= query.start_date`
- assignment: `status !== 'cancelled'`인 것만 포함
- 공고 단위 필터링 (공고 기간이 선택 범위와 겹치면 해당 공고의 전체 데이터 표시)

**Stats 및 hasIssues는 API 서버에서 계산하여 응답에 포함.**

## 컴포넌트 구조

```
app/(dashboard)/page.tsx                    — 메인 대시보드 페이지
components/dashboard/
  DashboardControls.tsx                     — 날짜 범위 선택 + 프리셋 버튼
  DashboardSummary.tsx                      — 상단 4개 요약 통계 카드
  JobPostingGrid.tsx                        — 2열 그리드 컨테이너
  JobPostingCard.tsx                        — 공고 요약 카드
  JobPostingDetail.tsx                      — 확장 패널 (탭 전환)
  JobPostingDetailAttendance.tsx            — 출석 탭 테이블
  JobPostingDetailContract.tsx              — 계약 탭 테이블
  JobPostingDetailRooms.tsx                 — 회의실 탭
```

## 상태 관리

| 상태 | 저장 위치 | 설명 |
|------|----------|------|
| 날짜 범위 | 로컬 state | 새로고침 시 "오늘" 기본 |
| 확장된 카드 ID | 로컬 state | `expandedJobId: string \| null` |
| 활성 탭 | 로컬 state | 확장 패널 내 출석/계약/회의실 |

## 데이터 페칭

- `useDashboard(startDate, endDate)` 훅을 `page.tsx` 내 인라인에서 `hooks/use-dashboard.ts`로 추출
- React Query로 캐싱, 날짜 범위가 queryKey에 포함
- queryKey factory 구조:
  ```typescript
  dashboard: {
    all: ["dashboard"] as const,
    byDateRange: (start: string, end: string) => ["dashboard", start, end] as const,
  }
  ```
- `dashboard.all`은 `["dashboard"]`로 유지하여 기존 invalidation 패턴(`queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`)이 prefix match로 계속 동작

## 기존 코드 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `app/(dashboard)/page.tsx` | 완전 교체 (인라인 훅 → 외부 훅으로 추출) |
| `app/api/dashboard/route.ts` | 완전 교체 |
| `lib/query-keys.ts` | dashboard에 `byDateRange` 추가 |
| `hooks/use-dashboard.ts` | 신규 생성 (기존 인라인 훅 추출 + 날짜 파라미터 추가) |
| `components/dashboard/*` | 신규 생성 (7개 파일) |

## 제외 사항

- 대시보드에서 출석/계약 상태 직접 수정 (기존 상세 페이지에서 처리)
- 회의실 배정 편집 (기존 room-assignments 페이지에서 처리)
- 대시보드 데이터 실시간 갱신 (수동 새로고침 또는 페이지 포커스 시 refetch)
