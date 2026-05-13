# 대시보드 면접교육 통합 디자인

## 개요

part-time-supervisor 앱 대시보드에 면접교육 공고 정보를 감독관과 동일한 수준으로 통합 표시한다. 캘린더에서 두 타입을 색상으로 구분하고, 우측 요약 통계에 면접교육 전용 섹션을 추가한다.

## 변경 범위

### 1. 캘린더 API (`/api/dashboard/calendar`)

**현재**: `supervisor.job_postings`만 조회, `.in("status", ["draft", "open", "in_progress"])`

**변경**:
- `supervisor.interview_job_postings`도 병렬 조회
- 감독관 필터: `.in("status", ["draft", "open", "in_progress"])` (기존 유지)
- 면접교육 필터: `.in("status", ["draft", "open"])` — `closed`/`completed`는 종료된 공고이므로 제외
- 응답에 `type: 'supervisor' | 'interview'` 필드 추가
- 하위호환성: 기존 `jobPostings` 배열 형태 유지, `type` 필드만 추가되므로 기존 소비자 파괴 없음

```typescript
// 응답
{
  jobPostings: [
    { id, title, platform, startDate, endDate, status, type: 'supervisor' },
    { id, title, platform, startDate, endDate, status, type: 'interview' },
  ]
}
```

### 2. 캘린더 UI (`DashboardCalendar`)

**제거**: 날짜 우측 상단 `+N` 파란 배지 (DashboardCalendar.tsx line 133-143의 JSX 블록 삭제)

**추가**: 날짜 숫자 아래 컬러 바 (배지가 있던 위치를 대체)
- 파란 바 (`bg-blue-500`): 해당 날짜에 감독관 공고 1개 이상 존재
- 주황 바 (`bg-amber-500`): 해당 날짜에 면접교육 공고 1개 이상 존재
- 둘 다 있으면 바 2줄 (파랑 위, 주황 아래)
- 바 크기: 가로 12px, 높이 3px, rounded-full, 중앙 정렬
- 공고 없는 날짜는 바 없음

**데이터 전파 경로**:
- API 응답 `type` 필드 → `CalendarJobPosting`에 `type` 추가 → `DayJobLabel`에 `type` 추가 → `CustomDayButton`에서 `dayMap.get(dateKey)`로 받은 labels를 `type`별로 분류하여 바 렌더

### 3. 대시보드 API (`/api/dashboard`)

**현재**: 감독관은 `jobPostings` 배열, 면접교육은 `interview` 객체(활동인력/인건비/지출결의)

**변경**:

#### 3-1. `interview` 객체 확장

```typescript
interview: {
  // 기존 유지
  activePersonnel: number;
  monthlyLaborCost: number;
  expenseReportStatus: 'draft' | 'finalized' | null;
  // 추가
  activeJobCount: number;        // 날짜 범위 내 면접교육 공고 수 (status: draft/open)
  totalAssigned: number;         // 면접교육 총 배정 인원 (status != cancelled)
  totalEstimatedCost: number;    // 면접교육 예상 비용
}
```

**`activeJobCount` 기준**: 대시보드 API의 `start_date`/`end_date` 파라미터가 면접교육 공고에도 동일하게 적용. 조건: `interview_job_postings.start_date <= endDate AND end_date >= startDate AND status IN ('draft', 'open')`

**`totalEstimatedCost` 계산 공식**:
```
totalEstimatedCost = SUM(각 assignment별):
  - status = 'cancelled'인 assignment 제외
  - pay_type = 'daily' → pay_rate
  - pay_type = 'hourly' → pay_rate × work_hours
    (work_hours가 null이면 job_posting의 work_start/work_end 기반 시간 계산)
```

#### 3-2. `jobPostings` 배열 통합

면접교육 공고도 `jobPostings` 배열에 추가. 타입을 유니온으로 정의:

```typescript
type DashboardJobPosting =
  | DashboardSupervisorJobPosting  // type: 'supervisor', workers 포함
  | DashboardInterviewJobPosting;  // type: 'interview', assignments 포함

type DashboardSupervisorJobPosting = {
  type: 'supervisor';
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  platform: string | null;
  workType: string | null;
  workers: SupervisorWorker[];  // 기존 구조
};

type DashboardInterviewJobPosting = {
  type: 'interview';
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  platform: string | null;
  assignments: InterviewAssignmentRow[];  // 면접교육 배정 인력
};

type InterviewAssignmentRow = {
  id: string;
  name: string;
  role: 'rp' | 'ft' | 'instructor' | 'other';
  payType: 'hourly' | 'daily';
  payRate: number;
  workHours: number | null;
  status: 'assigned' | 'completed' | 'cancelled';
};
```

`page.tsx`에서 공고 클릭 시 `jp.type`으로 분기하여 각각 다른 테이블을 렌더한다.

### 4. 우측 요약 통계 UI

**컴포넌트 전략**: `DashboardSummary`는 감독관 전용으로 유지. 면접교육용 `InterviewSummary` 컴포넌트를 신설한다. 카드 그리드 레이아웃(스타일)만 동일하게 맞추고, 내부 카드 구성은 각 도메인에 맞게 별도 정의.

**변경 후 구조** (위→아래):

1. **감독관 요약** — `● 감독관 요약 현황` (파란 도트)
   - 기존 DashboardSummary 5개 카드 그대로
   - 진행 중 공고, 총 배정 인원, 출석 완료, 계약 완료, 총 예상 비용

2. **면접교육 요약** — `● 면접교육 요약 현황` (주황 도트)
   - `InterviewSummary` 컴포넌트 (신설)
   - 5개 카드: 진행 중 공고, 총 배정 인원, 활동 인력, 이번달 인건비, 지출결의 상태
   - Props: `interview` 객체 전체를 받음

3. **합산 카드** — 기존 어두운 배경 카드 유지
   - 총 비용 = 감독관 예상비용 + 면접교육 인건비

### 5. 공고별 현황 (좌측 캘린더 아래)

**변경**:
- 감독관 + 면접교육 공고 통합 리스트
- 각 공고 제목 앞에 컬러 도트: `●` 파랑(감독관), `●` 주황(면접교육)
- 정렬: 시작일 기준 오름차순 (타입 무관하게 섞임)
- 클릭 시 `jp.type`으로 분기하여 우측 테이블 렌더:
  - **감독관 공고** (`type: 'supervisor'`): 기존대로 workers 테이블 (이름, 연락처, 회의실, 출석, 계약)
  - **면접교육 공고** (`type: 'interview'`): assignments 테이블 (이름, 역할, 급여유형, 급여, 상태)
- 상세 링크: 감독관 `/supervisor/job-postings/{id}`, 면접교육 `/interview/job-postings/{id}`

### 엣지 케이스

- **면접교육 공고 0건**: 면접교육 요약 섹션은 표시하되 모든 값 0/미작성
- **캘린더에 공고 없는 날짜**: 바 없음, 기존 빈 날짜와 동일
- **면접교육 assignment의 work_hours가 null**: job_posting의 work_start/work_end로 시간 계산, 둘 다 null이면 0 처리
- **API 에러**: 기존 에러 핸들링 패턴 유지 (500 응답 + console.error)

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/api/dashboard/calendar/route.ts` | interview_job_postings 병렬 조회 (status: draft/open), type 필드 추가 |
| `hooks/use-dashboard-calendar.ts` | `CalendarJobPosting`과 `DayJobLabel`에 type 추가 |
| `components/dashboard/DashboardCalendar.tsx` | 배지(line 133-143) 삭제 → 컬러 바로 교체, dayMap의 type별 분류 |
| `app/api/dashboard/route.ts` | 면접교육 공고 통계 추가, jobPostings에 면접교육 통합, 유니온 타입 |
| `hooks/use-dashboard.ts` | DashboardJobPosting 유니온 타입, interview 객체 확장 타입 |
| `components/dashboard/DashboardSummary.tsx` | 제목에 파란 도트 추가 |
| `components/dashboard/InterviewSummary.tsx` | **신설** — 면접교육 요약 5개 카드 |
| `app/(dashboard)/page.tsx` | InterviewSummary 추가, 공고 리스트에 도트/type 분기, 면접교육 테이블 렌더 |

## 색상 체계

| 구분 | 바/도트 | 배경 | 텍스트 |
|------|---------|------|--------|
| 감독관 | `bg-blue-500` | `bg-blue-50` | `text-blue-700` |
| 면접교육 | `bg-amber-500` | `bg-amber-50` | `text-amber-700` |
