# 경영관리 PRD

## 1. 개요

현재 admin은 식대, 복지포인트, 활동비, 근태, 연차, 조직, 평가 등 내부 운영 관리를 중심으로 구성되어 있다. 여기에 고객사별 매출, 견적서, 프로젝트 비용 정산을 추가하면 대표와 P&C가 고객사-프로젝트-견적-매출-비용 흐름을 같은 admin 안에서 추적할 수 있다.

이 기능은 기존 `비용 관리` 메뉴에 섞지 않고, 별도 상위 도메인인 `경영관리`로 분리한다. 기존 비용 관리는 내부 복지/운영비 성격이고, 경영관리는 외부 고객사/프로젝트/계약/매출/정산 성격이기 때문이다.

## 2. 목표

- 고객사별 매출과 프로젝트별 손익을 관리한다.
- 견적서 작성, 승인, 발송 상태를 추적한다.
- 프로젝트에 연결된 매출과 비용 정산 내역을 관리한다.
- 대표는 전체 매출, 비용, 마진, 미수/미지급 리스크를 볼 수 있다.
- P&C는 견적, 비용 정산, 증빙, 지급 상태를 운영 관리할 수 있다.

## 3. 비목표

- 세금계산서 자동 발행
- 은행 입금 자동 매칭
- 복식부기 수준의 회계 시스템
- 전자서명 기반 견적 승인
- 외부 회계 솔루션 연동
- 복잡한 PDF 템플릿 편집기

초기 버전은 회계 시스템이 아니라 운영 관리 도구로 제한한다.

## 4. 사용자와 권한

### 대표

- 경영관리 전체 조회 및 관리
- 매출, 비용, 마진, 미수금, 미지급금 조회
- 견적서 최종 승인 또는 확정
- 정산 리포트 조회

### P&C 팀장

- 고객사, 프로젝트, 견적서, 매출, 비용 정산 관리
- 견적서 승인 또는 상태 변경
- 비용 정산 승인, 반려, 지급 처리
- 정산 리포트 조회

### P&C 일반

- 고객사와 프로젝트 조회
- 견적서 작성 보조
- 비용 정산 등록 및 검토
- 매출/마진 리포트는 제한하거나 조회 불가

## 5. 권한 설계

`apps/admin/lib/rbac.ts`에 다음 권한을 추가한다.

```text
finance:read
finance:write
finance:approve
finance:report
```

권한 배분:

```text
대표
- finance:read
- finance:write
- finance:approve
- finance:report

P&C 팀장
- finance:read
- finance:write
- finance:approve
- finance:report

P&C 일반
- finance:read
- finance:write
```

마진 정보가 대표 전용이어야 하면 `finance:margin` 권한을 별도로 추가한다.

## 6. 정보 구조

admin 사이드바에 새 상위 메뉴를 추가한다.

```text
경영관리
- 고객사 관리
- 프로젝트/계약 관리
- 견적서 관리
- 매출 관리
- 비용 정산
- 정산 리포트
```

라우트:

```text
/finance/clients
/finance/projects
/finance/quotes
/finance/revenue
/finance/expenses
/finance/reports
```

Next.js 파일 위치:

```text
apps/admin/app/(dashboard)/finance/clients/page.tsx
apps/admin/app/(dashboard)/finance/projects/page.tsx
apps/admin/app/(dashboard)/finance/quotes/page.tsx
apps/admin/app/(dashboard)/finance/revenue/page.tsx
apps/admin/app/(dashboard)/finance/expenses/page.tsx
apps/admin/app/(dashboard)/finance/reports/page.tsx
```

## 7. 핵심 데이터 모델

### finance_clients

고객사 기본 정보.

- id
- name
- business_registration_number
- representative_name
- contact_name
- contact_phone
- contact_email
- payment_terms
- status: active / inactive
- memo
- created_at
- updated_at

### finance_projects

고객사에 연결되는 프로젝트 또는 계약 단위.

- id
- client_id
- name
- contract_start_date
- contract_end_date
- contract_amount
- owner_member_id
- status: draft / active / completed / paused / canceled
- memo
- created_at
- updated_at

### finance_quotes

견적서 헤더.

- id
- client_id
- project_id
- quote_no
- quote_date
- valid_until
- subtotal_amount
- tax_amount
- total_amount
- status: draft / sent / approved / rejected / expired
- approved_by
- approved_at
- sent_at
- memo
- created_at
- updated_at

### finance_quote_items

견적서 품목.

- id
- quote_id
- name
- description
- quantity
- unit_price
- supply_amount
- tax_amount
- total_amount
- sort_order

### finance_revenue_records

매출 예정/확정 기록.

- id
- client_id
- project_id
- quote_id
- revenue_month
- revenue_date
- amount
- tax_invoice_status: none / scheduled / issued
- expected_payment_date
- paid_at
- status: expected / invoiced / paid / overdue / canceled
- memo
- created_at
- updated_at

### finance_expense_records

프로젝트 비용 정산 기록.

- id
- project_id
- requester_id
- expense_type
- used_at
- amount
- description
- status: draft / submitted / approved / paid / rejected
- approved_by
- approved_at
- paid_at
- reject_reason
- memo
- created_at
- updated_at

### finance_attachments

견적서, 매출, 비용 정산에 연결되는 파일.

- id
- related_table
- related_id
- file_name
- file_path
- file_size
- content_type
- uploaded_by
- created_at

### finance_audit_logs

상태 변경 및 주요 수정 이력.

- id
- entity_type
- entity_id
- action
- before_data
- after_data
- actor_id
- created_at

## 8. 주요 업무 흐름

### 견적 흐름

1. 고객사 등록
2. 프로젝트/계약 등록
3. 견적서 작성
4. 품목 추가 및 금액 자동 계산
5. 견적서 상태 변경: 작성, 발송, 승인, 반려, 만료
6. 승인된 견적서를 기준으로 매출 예정 생성

### 매출 흐름

1. 프로젝트 또는 견적서 기준 매출 예정 등록
2. 세금계산서 발행 상태 관리
3. 입금 예정일 관리
4. 실제 입금 처리
5. 미수 상태 자동 또는 수동 표시

### 비용 정산 흐름

1. 프로젝트 기준 비용 정산 등록
2. 증빙 파일 첨부
3. P&C 검토
4. 승인 또는 반려
5. 지급 처리
6. 프로젝트별 비용 집계 반영

### 정산 리포트 흐름

1. 기간 선택
2. 고객사별 매출 집계
3. 프로젝트별 매출/비용/마진 집계
4. 미수금, 미지급금 목록 확인
5. 대표 또는 P&C 팀장이 정산 상태 확인

## 9. 화면 요구사항

### 고객사 관리

- 고객사 목록
- 상태 필터
- 고객사명 검색
- 고객사 등록/수정/비활성화
- 고객사 상세에서 프로젝트, 견적, 매출 내역 연결 표시

### 프로젝트/계약 관리

- 고객사별 프로젝트 목록
- 계약 기간, 계약 금액, 담당자, 상태 표시
- 프로젝트 상세에서 견적서, 매출, 비용 정산 내역 표시

### 견적서 관리

- 견적서 목록
- 상태 필터: 작성, 발송, 승인, 반려, 만료
- 고객사/프로젝트 검색
- 견적서 작성/수정
- 품목 행 추가/삭제
- 공급가, 세액, 합계 자동 계산
- 상태 변경
- PDF 출력은 2차 범위로 둔다.

### 매출 관리

- 월별 매출 목록
- 고객사/프로젝트 필터
- 매출 예정/확정/입금 상태 관리
- 미수 상태 표시
- 세금계산서 발행 상태 표시

### 비용 정산

- 프로젝트별 비용 정산 목록
- 비용 유형, 신청자, 사용일, 금액, 증빙, 상태 표시
- 승인/반려/지급 처리
- 반려 사유 입력

### 정산 리포트

- 월별 총 매출
- 월별 총 비용
- 예상 마진
- 고객사별 매출
- 프로젝트별 손익
- 미수금 목록
- 미지급금 목록

## 10. MVP 범위

### 1차

- DB migration
- RBAC 권한 추가
- 고객사 CRUD
- 프로젝트/계약 CRUD
- 견적서 CRUD
- 견적서 품목 관리
- 매출 예정/확정 관리
- 비용 정산 등록/승인/지급 상태 관리

### 2차

- 정산 리포트
- 고객사별 매출 추이
- 프로젝트별 손익
- 미수/미지급 알림
- 월별 정산 마감
- 견적서 버전 관리

### 3차

- 견적서 PDF 출력
- 세금계산서 상태 고도화
- Slack 알림
- 파일 보관 정책
- 감사 로그 상세 화면

## 11. API 계획

```text
GET/POST        /api/finance/clients
GET/PUT/DELETE  /api/finance/clients/[id]

GET/POST        /api/finance/projects
GET/PUT/DELETE  /api/finance/projects/[id]

GET/POST        /api/finance/quotes
GET/PUT/DELETE  /api/finance/quotes/[id]
POST            /api/finance/quotes/[id]/items
PUT/DELETE      /api/finance/quotes/[id]/items/[itemId]
POST            /api/finance/quotes/[id]/status

GET/POST        /api/finance/revenue
GET/PUT/DELETE  /api/finance/revenue/[id]

GET/POST        /api/finance/expenses
GET/PUT/DELETE  /api/finance/expenses/[id]
POST            /api/finance/expenses/[id]/status

GET             /api/finance/reports/summary
GET             /api/finance/reports/by-client
GET             /api/finance/reports/by-project
```

모든 API는 `requireAdminPermission`으로 권한을 확인한다.

## 12. 대시보드 연동

대시보드는 초기 범위가 아니다. 다만 2차 이후 대표 전용 요약 카드로 다음 정보를 노출한다.

- 이번 달 매출
- 전월 대비 증감
- 미수금
- 정산 대기 비용
- 고객사별 매출 Top 5
- 프로젝트별 손익 Top/Bottom

## 13. 수용 기준

- 대표는 경영관리 전체 메뉴에 접근할 수 있다.
- P&C 팀장은 경영관리 등록, 수정, 승인, 리포트 조회가 가능하다.
- P&C 일반은 경영관리 등록/수정은 가능하지만 리포트 또는 마진 정보 접근은 제한할 수 있다.
- 고객사와 프로젝트를 생성하고 연결할 수 있다.
- 견적서에 품목을 추가하면 공급가, 세액, 합계가 계산된다.
- 승인된 견적서를 기준으로 매출 예정 기록을 만들 수 있다.
- 프로젝트별 비용 정산을 등록하고 승인/반려/지급 처리할 수 있다.
- 프로젝트별 매출, 비용, 마진을 집계할 수 있다.
- 기존 식대/복지포인트/활동비 메뉴와 데이터 구조를 침범하지 않는다.

## 14. 구현 순서

1. DB migration 작성
2. RBAC 권한 추가
3. query keys와 공통 타입 정의
4. 고객사 API/화면
5. 프로젝트 API/화면
6. 견적서 API/화면
7. 매출 API/화면
8. 비용 정산 API/화면
9. 정산 리포트 API/화면
10. 대표 전용 대시보드 요약 연동

## 15. 커밋 단위 제안

```text
feat(finance): 경영관리 DB 스키마 추가
feat(admin): 경영관리 권한과 사이드바 연결
feat(admin): 고객사와 프로젝트 관리 추가
feat(admin): 견적서 관리 추가
feat(admin): 매출 관리 추가
feat(admin): 비용 정산 관리 추가
feat(admin): 정산 리포트 추가
feat(admin): 대표 대시보드 경영관리 요약 추가
```
