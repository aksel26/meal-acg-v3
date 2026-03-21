# 면접교육 정산 관리 기능 설계

## 개요

면접교육&검사 팀 전용 정산 관리 기능을 `part-time-supervisor` 앱에 추가한다. 기존 감독관(운영팀) 비용관리와 같은 앱 내에서 사이드바 하위 메뉴로 구분하며, 별도 인력 풀(RP, FT, 강사)과 독립된 데이터 모델을 사용한다.

## 배경

- **사용자**: 면접교육&검사 팀 소속 별도 담당자
- **기존 상태**: 감독관 정산(`/cost-management`)은 workers/assignments/work_records 기반으로 이미 구현됨
- **핵심 차이**: 면접교육 인력은 기존 workers 테이블과 독립된 별도 인력 풀
- **지출결의서**: 현재는 Excel/PDF 내보내기 중심, 향후 결재 프로세스 확장 가능

## 사이드바 구조

기존 flat 메뉴에서 1Depth/2Depth nested 구조로 재구성:

```
대시보드                              → /

감독관  ▾
  ├─ 공고 관리                        → /supervisor/job-postings
  ├─ 지원자 관리                      → /supervisor/workers
  ├─ 회의실 배정                      → /room-assignments
  └─ 정산 관리                        → /supervisor/cost-management

면접교육  ▾
  ├─ 인력 관리                        → /interview/personnel
  ├─ 회의실 배정                      → /room-assignments  (공유)
  └─ 정산 관리                        → /interview/settlement
```

- 1Depth 메뉴는 클릭 시 하위 메뉴 토글
- 현재 경로에 해당하는 1Depth 자동 펼침
- 회의실 배정은 양쪽에서 동일한 `/room-assignments` 링크

## URL 구조 변경

### 기존 → 변경

| 기존 URL | 변경 URL | 비고 |
|----------|----------|------|
| `/` | `/` | 유지 |
| `/job-postings` | `/supervisor/job-postings` | 경로 이동 |
| `/job-postings/[id]` | `/supervisor/job-postings/[id]` | 경로 이동 |
| `/workers` | `/supervisor/workers` | 경로 이동 |
| `/cost-management` | `/supervisor/cost-management` | 경로 이동 |
| `/room-assignments` | `/room-assignments` | 유지 |

### 신규 URL

| URL | 설명 |
|-----|------|
| `/interview/personnel` | 면접교육 인력 관리 |
| `/interview/settlement` | 면접교육 정산 |

## 데이터 모델

기존 `supervisor` 스키마에 테이블 추가.

### `interview_personnel` (면접교육 인력)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | text NOT NULL | 이름 |
| phone | text | 연락처 |
| role | enum(`rp`, `ft`, `instructor`) NOT NULL | 역할 |
| bank_name | text | 은행명 |
| account_number | text | 계좌번호 |
| pay_type | enum(`hourly`, `daily`, `contract`) NOT NULL | 기본 급여 유형 |
| default_pay_rate | numeric | 기본 단가 (시급/일급, RP용) |
| contract_amount | numeric | 계약금 (FT/강사용) |
| memo | text | 메모 |
| status | enum(`active`, `inactive`) DEFAULT `active` | 상태 |
| created_at | timestamptz DEFAULT now() | |

### `interview_work_records` (면접교육 근무기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| personnel_id | uuid FK → interview_personnel NOT NULL | |
| work_date | date NOT NULL | 근무일 |
| work_hours | numeric NOT NULL | 근무시간 |
| pay_rate_override | numeric | 개별 단가 오버라이드 |
| pay_type_override | enum(`hourly`, `daily`) | 개별 급여 유형 오버라이드 |
| note | text | 비고 |
| created_at | timestamptz DEFAULT now() | |

### `interview_expense_reports` (지출결의서)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| year | int NOT NULL | 연도 |
| month | int NOT NULL | 월 |
| title | text NOT NULL | 결의서 제목 |
| items | jsonb DEFAULT '[]' | 부가 비용 항목 배열 `[{name, amount, note}]` |
| total_labor_cost | numeric DEFAULT 0 | 인건비 합계 (자동 산정) |
| total_extra_cost | numeric DEFAULT 0 | 부가 비용 합계 |
| grand_total | numeric DEFAULT 0 | 총합 |
| status | enum(`draft`, `finalized`) DEFAULT `draft` | |
| created_at | timestamptz DEFAULT now() | |

### 급여 산정 로직

- **RP**: `work_records` 기반. 시급제 = `pay_rate × work_hours`, 일급제 = `pay_rate × 1`
  - 개인별 단가 오버라이드 가능 (`pay_rate_override`)
  - 기본값은 `interview_personnel.default_pay_rate`
- **FT/강사**: `interview_personnel.contract_amount` 총액 기준 정산. 근무기록 불필요

## 페이지 설계

### 면접교육 정산 (`/interview/settlement`)

```
┌─────────────────────────────────────────────────┐
│  ← 2026년 3월 →          [지출결의서] [Excel]   │
├─────────────────────────────────────────────────┤
│  요약 카드                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 총 인건비 │ │ 인력 수  │ │ 총 근무  │         │
│  │ 3,500,000│ │    12명  │ │ 시간/건  │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│  [전체] [RP] [FT] [강사]     🔍 이름 검색       │
├─────────────────────────────────────────────────┤
│  이름    │ 역할 │ 급여유형 │ 근무일수 │ 산정금액 │
│─────────┼──────┼─────────┼─────────┼─────────│
│  김○○   │ RP  │ 시급    │   5일   │ 450,000 │
│    └ 상세: 날짜별 근무기록 (확장 행)             │
│  이○○   │ FT  │ 계약금  │   -     │2,000,000│
│  박○○   │ 강사 │ 계약금  │   -     │1,500,000│
└─────────────────────────────────────────────────┘
```

- 역할 필터 탭으로 전체/RP/FT/강사 필터링
- RP 행 클릭 시 확장하여 날짜별 근무기록 표시
- FT/강사 행은 계약금 총액 표시, 근무일수 비표시
- 지출결의서 버튼: 해당 월 지출결의서 작성/편집 다이얼로그
- Excel 버튼: 요약+상세 시트 내보내기

### 인력 관리 (`/interview/personnel`)

```
┌─────────────────────────────────────────────────┐
│  🔍 이름 검색    [전체] [RP] [FT] [강사]  [추가]│
├─────────────────────────────────────────────────┤
│  이름  │ 역할 │ 연락처  │ 급여유형 │ 단가/계약금│ 상태 │
│────────┼──────┼────────┼─────────┼───────────┼─────│
│  김○○  │ RP  │ 010-..│ 시급    │   12,000  │ 활동 │
│  이○○  │ FT  │ 010-..│ 계약금  │ 2,000,000 │ 활동 │
│  박○○  │ 강사│ 010-..│ 계약금  │ 1,500,000 │비활동│
└─────────────────────────────────────────────────┘
```

- 추가/수정 다이얼로그: 이름, 연락처, 역할, 은행명, 계좌번호
  - RP: 급여 유형(시급/일급) + 기본 단가
  - FT/강사: 계약금 직접 입력
- RP 행 클릭 시 상세에서 근무기록 CRUD

### 대시보드 (`/`)

기존 대시보드에 면접교육 섹션 및 합산 섹션 추가:

```
┌─────────────────────────────────────────────────┐
│  감독관                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 진행중공고│ │ 배정인원 │ │ 이번달비용│         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│  면접교육                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 활동인력 │ │ 이번달   │ │ 지출결의 │         │
│  │   12명   │ │ 인건비   │ │  상태    │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│  합산                                            │
│  ┌──────────────────┐                            │
│  │ 이번달 총 비용    │                            │
│  │   8,500,000원    │                            │
│  └──────────────────┘                            │
└─────────────────────────────────────────────────┘
```

## API 라우트

### 기존 (변경 없음)

API 라우트 URL은 변경하지 않는다. 프론트 페이지 URL만 변경.

- `/api/job-postings/*`, `/api/workers/*`, `/api/cost-management/*`, `/api/room-assignments/*` 등

### 신규

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/interview/personnel` | GET, POST | 인력 목록 조회, 추가 |
| `/api/interview/personnel/[id]` | GET, PATCH, DELETE | 인력 상세, 수정, 삭제 |
| `/api/interview/work-records` | GET, POST | 근무기록 월별 조회, 추가 |
| `/api/interview/work-records/[id]` | PATCH, DELETE | 근무기록 수정, 삭제 |
| `/api/interview/settlement` | GET | 월별 정산 조회 (인력+근무기록+계약금 합산) |
| `/api/interview/settlement/export` | GET | Excel 내보내기 |
| `/api/interview/expense-reports` | GET, POST | 지출결의서 목록, 생성 |
| `/api/interview/expense-reports/[id]` | GET, PATCH, DELETE | 지출결의서 상세, 수정, 삭제 |

### 대시보드 API 변경

`/api/dashboard` — 기존 감독관 데이터에 면접교육 데이터 합산 추가.

## 기존 코드 재활용

- `lib/cost-utils.ts` — `calculateAmount`, `formatCurrency` 공유
- Excel export 패턴 — `exceljs` 기반 요약+상세 시트
- `CostSummaryCards` 컴포넌트 패턴 — 유사한 요약 카드 UI
- `CostWorkerExpandedRow` 패턴 — RP 근무기록 확장 행
- `PayRateOverrideForm` 패턴 — 개별 단가 오버라이드

## 향후 확장

- 지출결의서 결재 프로세스 (draft → submitted → approved)
- 팀별 접근 권한 제어
- P&C 팀 연동 (명세서 전달 자동화)
