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
| 통계 | 설명 |
|------|------|
| 진행 중 공고 | 해당 기간 내 활성 공고 수 |
| 총 배정 인원 | 전체 배정된 인원 합계 |
| 출석 완료 | 출석확인 완료 인원 / 총 배정 |
| 계약 완료 | 계약확인 완료 인원 / 총 배정 |

### 공고별 그리드 (2열)
- 각 공고가 카드로 표시
- 카드 내용: 공고 제목, 기간, 장소, 시간, 상태 배지
- 미니 통계 3칸: 배정 인원 / 출석 현황 / 계약 현황
- **문제 카드**: 빨간 테두리 + 하단 경고 메시지

### 확장 패널
- 카드 클릭 시 해당 카드 아래에 확장 패널 표시
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

## 문제 감지 로직

### 판별 기준
- 미출석 인원이 배정 인원의 **50% 이상** → `hasIssues: true`
- 미계약 인원이 배정 인원의 **50% 이상** → `hasIssues: true`
- 둘 중 하나라도 해당하면 문제 카드로 표시

### 시각적 처리
- 정상 카드: 기본 테두리
- 문제 카드: `border-red-500` + "⚠ 미출석 N명 · 미계약 N명" 경고
- 비율별 색상:
  - 80% 이상: 초록
  - 50~80%: 노랑
  - 50% 미만: 빨강

## API 설계

### `GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

기존 `/api/dashboard`를 완전 교체.

**응답:**
```typescript
{
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
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
      attendanceCheckedIn: number;
      attendanceConfirmed: number;
      contractSigned: number;
      contractConfirmed: number;
    };
    hasIssues: boolean;
  }>;
}
```

### 데이터 조합 로직
1. `supervisor.job_postings`에서 기간 겹치는 공고 조회 (`start_date <= end_date AND end_date >= start_date`)
2. 각 공고의 `supervisor.assignments` 조회 (status != 'cancelled')
3. 각 assignment의 worker 정보를 `supervisor.workers`에서 조인
4. assignment의 `attendance_status`, `contract_status`, `room_slots` 포함
5. stats 집계 및 hasIssues 판별

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

- `useDashboard(startDate, endDate)` 훅 수정
- React Query로 캐싱, 날짜 범위가 queryKey에 포함
- queryKey: `queryKeys.dashboard.byDateRange(startDate, endDate)`

## 기존 코드 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `app/(dashboard)/page.tsx` | 완전 교체 |
| `app/api/dashboard/route.ts` | 완전 교체 |
| `lib/query-keys.ts` | dashboard에 `byDateRange` 추가 |
| `hooks/use-dashboard.ts` | 날짜 파라미터 추가 |
| `components/dashboard/*` | 신규 생성 (7개 파일) |

## 제외 사항

- 대시보드에서 출석/계약 상태 직접 수정 (기존 상세 페이지에서 처리)
- 회의실 배정 편집 (기존 room-assignments 페이지에서 처리)
- 대시보드 데이터 실시간 갱신 (수동 새로고침 또는 페이지 포커스 시 refetch)
