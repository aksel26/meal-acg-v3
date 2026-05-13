# 비용관리 기능 설계

> Part-time Supervisor 앱에 지원자별 월 단위 비용 산정 기능 추가

## 요구사항 요약

- 지원자(worker) 중심 월별 비용 산정
- 근무 시간: 공고 기준 기본값 + 관리자 인라인 수정
- 일급제: 시간 기록하되 금액은 일급 단위 산정
- 단가: 공고 기준 기본값 + 지원자별 오버라이드
- 산정 결과 엑셀 내보내기 (외부 정산)

## 데이터 모델

### assignments 테이블 변경

기존 `supervisor.assignments` 테이블에 단가 오버라이드 컬럼 추가:

```sql
ALTER TABLE supervisor.assignments ADD COLUMN pay_rate_override numeric CHECK (pay_rate_override IS NULL OR pay_rate_override > 0);
ALTER TABLE supervisor.assignments ADD COLUMN pay_type_override text CHECK (pay_type_override IS NULL OR pay_type_override IN ('hourly', 'daily'));
```

- `NULL`이면 공고의 `pay_rate`/`pay_type` 사용
- 값이 있으면 해당 지원자에게만 적용

### 신규 테이블: work_records

```sql
CREATE TABLE supervisor.work_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES supervisor.assignments(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  work_hours numeric(4,1) NOT NULL CHECK (work_hours >= 0 AND work_hours <= 24),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, work_date)
);

-- updated_at 자동 갱신 트리거 (기존 supervisor 패턴과 동일)
CREATE TRIGGER set_work_records_updated_at
  BEFORE UPDATE ON supervisor.work_records
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
```

- `assignment_id`로 worker + job_posting 관계 추론
- `work_date + assignment_id` 유니크 제약으로 중복 방지
- `work_hours`는 numeric(4,1)로 소수점 1자리까지, CHECK 제약으로 0~24 범위 제한
- `updated_at`은 moddatetime 트리거로 자동 갱신

### RLS 정책

기존 패턴과 동일하게 `service_role` only:

```sql
ALTER TABLE supervisor.work_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON supervisor.work_records
  FOR ALL USING (auth.role() = 'service_role');
```

### 금액 계산 로직

```
시급제: effective_pay_rate × work_hours
일급제: effective_pay_rate × 1 (출근일수 기준, work_hours는 통계용)

effective_pay_rate = assignment.pay_rate_override ?? job_posting.pay_rate
effective_pay_type = assignment.pay_type_override ?? job_posting.pay_type
```

## 페이지 구성

### 라우트

`/cost-management` — 사이드바 5번째 메뉴 (Calculator 아이콘)

### 레이아웃

**상단: 필터 영역**
- 월 선택 (년-월 picker, 기본값: 이번 달)
- 검색 (지원자 이름)

**중단: 월별 요약 카드**
- 총 산정 금액 | 총 근무 인원 | 총 근무 시간 | 총 근무 일수

**하단: 지원자별 비용 테이블**

| 지원자명 | 참여 공고 | 근무 일수 | 총 근무 시간 | 단가 | 산정 금액 | 상세 |
|---------|----------|----------|------------|-----|---------|-----|
| 김철수 | 2건 | 12일 | 96.0h | — | 1,440,000원 | 펼치기 |
| 이영희 | 1건 | 8일 | 64.0h | — | 960,000원 | 펼치기 |

**상세 펼침 (Expandable Row)** — 행 클릭 시 아래로 확장:

| 공고명 | 기간 | 급여 타입 | 단가 | 근무 일수 | 총 시간 | 소계 | 수정 |
|-------|------|---------|-----|---------|-------|-----|-----|
| 3월 채점 | 3/1~3/5 | 시급 | 15,000원 | 5일 | 40.0h | 600,000원 | 수정 |
| 3월 면접 | 3/10~3/15 | 일급 | 150,000원 | 7일 | 56.0h | 1,050,000원 | 수정 |

**수정 버튼 클릭 시** — 근무 기록 편집 모달:

| 날짜 | 근무 시간 | 비고 |
|-----|---------|-----|
| 3/1 | 8.0h | — |
| 3/2 | 7.5h | 조기 퇴근 |

\+ 단가 오버라이드 설정 (커스텀 단가 지정/해제)

**엑셀 내보내기 버튼** — 상단 위치, 현재 월 전체 비용 산정 결과 다운로드

## API 설계

### 1. 월별 비용 산정 조회

```
GET /api/cost-management?year=2026&month=3&search=김철수
```

검색은 지원자 이름에 대한 대소문자 무관 부분 일치 (ILIKE '%keyword%'). 빈 값이면 전체 조회.

응답:

```typescript
{
  summary: {
    totalAmount: number;
    totalWorkers: number;
    totalWorkHours: number;
    totalWorkDays: number;
  },
  workers: [{
    workerId: string;
    workerName: string;
    totalAmount: number;
    totalWorkDays: number;
    totalWorkHours: number;
    postingCount: number;
    postings: [{
      jobPostingId: string;
      jobPostingTitle: string;
      assignmentId: string;
      startDate: string;
      endDate: string;
      payType: 'hourly' | 'daily';
      effectivePayRate: number;
      isOverridden: boolean;
      workDays: number;
      totalHours: number;
      subtotal: number;
    }]
  }]
}
```

### 2. 일별 근무 기록 조회

```
GET /api/work-records?assignment_id=xxx
```

### 3. 근무 기록 일괄 생성

```
POST /api/work-records/generate
Body: { assignmentId }
```

공고 기간 중 미생성 날짜에 대해 기본 work_hours로 일괄 생성. 기존 기록은 보존. 생성 후 전체 목록 반환.

### 4. 근무 기록 수정 (Upsert)

```
POST /api/work-records
Body: { assignmentId, records: [{ workDate, workHours, note }] }
```

`assignment_id + work_date` 기준 upsert. 배치로 여러 날짜 한번에 저장.

### 5. 단가 오버라이드 설정

```
PATCH /api/assignments/[id]/pay-override
Body: { payRate: number | null, payType: 'hourly' | 'daily' | null }
```

`null` 전송 시 오버라이드 제거 (공고 기본값 복귀).

### 6. 엑셀 내보내기

```
GET /api/cost-management/export?year=2026&month=3
```

`exceljs`로 생성. 시트 구성:
- **요약 시트**: 지원자별 총 산정 금액, 근무 일수, 근무 시간
- **상세 시트**: 지원자별 공고별 일별 근무 기록

### work_records 일괄 생성

현재 출석 확인(`confirm-attendance`)은 assignment당 1회성 이벤트이므로 일별 자동 생성 트리거로 사용할 수 없음.

대신 **비용관리 페이지의 "수정" 모달 진입 시** 일괄 생성:
- 해당 assignment의 공고 기간(`start_date~end_date`) 중 work_record가 없는 날짜에 대해 기본값으로 자동 생성
- 기본 `work_hours` 계산: 공고의 `work_start~work_end` 시간 차이 - 점심시간(`lunch_start~lunch_end`)
- **시간 필드 null 대응**: `work_start` 또는 `work_end`가 null이면 기본 8.0h 적용. `lunch_start` 또는 `lunch_end`가 null이면 점심 공제 없음
- 이미 존재하는 날짜의 기록은 건드리지 않음 (관리자가 수정한 값 보존)
- 생성 API: `POST /api/work-records/generate` — `{ assignmentId }` 전송 시 미생성 날짜에 대해 일괄 생성 후 전체 목록 반환

## 컴포넌트 구조

```
components/cost-management/
  CostManagementPage.tsx      — 메인 페이지 (필터 + 요약 + 테이블)
  CostSummaryCards.tsx         — 상단 요약 카드 4개
  CostWorkerTable.tsx          — 지원자별 비용 테이블
  CostWorkerExpandedRow.tsx    — 펼침 행 (공고별 상세)
  WorkRecordEditModal.tsx      — 일별 근무 기록 편집 모달
  PayRateOverrideForm.tsx      — 단가 오버라이드 설정 폼 (모달 내 포함)
  CostExportButton.tsx         — 엑셀 내보내기 버튼
```

## 훅

```
hooks/
  use-cost-management.ts       — 월별 비용 산정 조회 (useQuery)
  use-work-records.ts          — 일별 근무 기록 조회/수정 (useQuery + useMutation)
  use-pay-override.ts          — 단가 오버라이드 설정 (useMutation)
  use-cost-export.ts           — 엑셀 내보내기 (useMutation)
```

## 쿼리 키

```typescript
// lib/query-keys.ts 에 추가
costManagement: {
  all: ["costManagement"] as const,
  byMonth: (year: number, month: number) =>
    ["costManagement", year, month] as const,
},
workRecords: {
  all: ["workRecords"] as const,
  byAssignment: (assignmentId: string) =>
    ["workRecords", assignmentId] as const,
},
```

## 쿼리 무효화 패턴

```typescript
// 근무 기록 수정 시
queryClient.invalidateQueries({ queryKey: queryKeys.costManagement.all });
queryClient.invalidateQueries({ queryKey: queryKeys.workRecords.byAssignment(id) });

// 단가 오버라이드 설정 시
queryClient.invalidateQueries({ queryKey: queryKeys.costManagement.all });
queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });

// 출석 확인 시 (기존 로직에 추가)
queryClient.invalidateQueries({ queryKey: queryKeys.costManagement.all });
```

## TypeScript 타입 업데이트

`lib/supabase/types.ts`의 `Assignment` 타입에 추가:

```typescript
pay_rate_override: number | null;
pay_type_override: 'hourly' | 'daily' | null;
```

신규 `WorkRecord` 타입 추가:

```typescript
interface WorkRecord {
  id: string;
  assignment_id: string;
  work_date: string;
  work_hours: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}
```

## 사이드바 변경

기존 4개 메뉴 아래에 추가:
- **비용 관리** (`/cost-management`) — Calculator 아이콘 (lucide-react)
