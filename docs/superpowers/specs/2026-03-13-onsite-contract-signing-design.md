# 현장 계약 서명 시스템 설계

## 개요

공고별 고유 URL/QR 코드를 생성하여, 현장에 도착한 지원자가 모바일로 약관 동의 + 전자서명을 완료하는 시스템. 관리자가 최종 승인하면 계약 프로세스 완료.

## 전체 흐름

```
관리자: 공고 상세 → "계약 링크 생성" → 공고별 고유 URL/QR 생성
지원자: QR 스캔 → Greeting → 약관 동의 → 공고 정보 확인 → 계약서 서명 → 제출 완료
관리자: 공고 상세 지원자 명단 → 계약 상태 확인 → 최종 승인
```

## 1. 공개 페이지 (인증 불필요)

### 라우팅

`/contract/[jobPostingId]` — `(dashboard)` 레이아웃 그룹 밖에 위치하여 미들웨어 인증 우회.

### 스텝 위자드 (5단계)

| 단계 | 화면 | 설명 |
|------|------|------|
| 1 | Greeting | 환영 메시지 + 본인 확인 (이름 + 전화번호 입력 → DB에 등록된 worker + assignment 매칭) |
| 2 | 약관 동의 | 고정 약관 텍스트 표시. 전체 동의 체크 시 다음 버튼 활성화 |
| 3 | 공고 정보 | 해당 공고 상세 정보 읽기 전용 표시 (제목, 기간, 근무시간, 급여, 장소 등) |
| 4 | 계약서 서명 | 계약서 템플릿 (공고 + 지원자 정보 자동 채움) + Canvas 전자서명 패드 |
| 5 | 제출 완료 | 완료 메시지. 관리자 최종 확인 대기 안내 |

### 본인 확인 로직

1. 지원자가 이름 + 전화번호 입력
2. `supervisor.workers` 테이블에서 name + phone 매칭
3. 매칭된 worker가 해당 공고의 `assignments`에 존재하는지 확인
4. 매칭 실패 시 에러 메시지 ("등록되지 않은 지원자입니다")
5. 이미 서명 완료한 경우 ("이미 서명이 완료되었습니다") 안내

## 2. API 엔드포인트

모두 공개 (인증 불필요). 공고 ID 기반 접근.

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/contract/[jobPostingId]` | 공고 정보 조회 (공개용 최소 정보) |
| POST | `/api/contract/[jobPostingId]/verify` | 이름+전화번호로 지원자 매칭. 성공 시 worker_id + assignment_id 반환 |
| POST | `/api/contract/[jobPostingId]/submit` | 약관 동의 확인 + 서명 이미지 저장 + contract_status 업데이트 |

### verify API 응답

```json
{
  "worker_id": "uuid",
  "assignment_id": "uuid",
  "worker_name": "홍길동",
  "already_signed": false
}
```

### submit API 요청

```json
{
  "assignment_id": "uuid",
  "worker_id": "uuid",
  "terms_agreed": true,
  "signature_image": "base64 encoded PNG"
}
```

## 3. DB 변경

### `supervisor.assignments` 테이블 컬럼 추가

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `contract_status` | `text CHECK (contract_status IN ('signed', 'confirmed'))` | null=미서명, signed=서명완료, confirmed=관리자승인 |
| `signature_image_path` | `text` | Supabase Storage 경로 |
| `signed_at` | `timestamptz` | 서명 일시 |
| `confirmed_at` | `timestamptz` | 관리자 최종 승인 일시 |

### 마이그레이션 파일

`supabase/migrations/20260313_contract_signing.sql`

## 4. 서명 이미지 저장

- Supabase Storage `signatures` 버킷 (private)
- 경로: `signatures/{jobPostingId}/{workerId}.png`
- submit API에서 base64 → Buffer 변환 후 업로드

## 5. 관리자 측 변경

### 공고 상세 페이지 (`/job-postings/[id]`)

- **"계약 링크" 버튼 추가:** 클릭 시 URL 클립보드 복사 (`{APP_URL}/contract/{jobPostingId}`)
- **"QR 보기" 버튼 추가:** 클릭 시 QR 코드 모달 표시 (qrcode 라이브러리 사용)

### 지원자 명단 테이블 (AssignedWorkersTable)

- **계약 상태 컬럼 추가:**
  - `null` → 회색 "미서명"
  - `signed` → 노란색 "서명완료"
  - `confirmed` → 초록색 "확인완료"
- **"승인" 버튼:** `signed` 상태인 행에만 표시. 클릭 시 `confirmed`로 업데이트

### 승인 API

`PUT /api/assignments/[id]` 기존 API에 `contract_status: 'confirmed'` 업데이트 지원 (이미 존재).

## 6. 계약서 템플릿

HTML 기반 기본 근로계약서. 다음 정보가 자동 채워짐:

- **공고 정보:** 제목, 근무 기간, 근무 시간, 급여, 장소
- **지원자 정보:** 이름, 전화번호

하드코딩된 고정 양식. 향후 관리자 편집 기능 확장 가능.

## 7. 의존성 추가

- `qrcode` — QR 코드 생성 (관리자 페이지)
- `signature_pad` — Canvas 전자서명 (공개 페이지)

## 8. 타입 변경

### `AssignmentWithDetails` 확장

```typescript
export type Assignment = {
  // ... 기존 필드
  contract_status: 'signed' | 'confirmed' | null;
  signature_image_path: string | null;
  signed_at: string | null;
  confirmed_at: string | null;
};
```

## 파일 목록

### 신규 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/20260313_contract_signing.sql` | DB 마이그레이션 |
| `app/contract/[jobPostingId]/page.tsx` | 공개 계약 페이지 (스텝 위자드) |
| `app/contract/[jobPostingId]/layout.tsx` | 공개 페이지 레이아웃 (최소 스타일) |
| `app/api/contract/[jobPostingId]/route.ts` | 공고 정보 공개 조회 |
| `app/api/contract/[jobPostingId]/verify/route.ts` | 본인 확인 API |
| `app/api/contract/[jobPostingId]/submit/route.ts` | 서명 제출 API |
| `components/contract/StepWizard.tsx` | 스텝 위자드 컨테이너 |
| `components/contract/GreetingStep.tsx` | 1단계: 환영 + 본인확인 |
| `components/contract/TermsStep.tsx` | 2단계: 약관 동의 |
| `components/contract/JobInfoStep.tsx` | 3단계: 공고 정보 |
| `components/contract/SignatureStep.tsx` | 4단계: 계약서 + 서명 |
| `components/contract/CompleteStep.tsx` | 5단계: 완료 |
| `components/contract/ContractTemplate.tsx` | 계약서 템플릿 컴포넌트 |
| `components/contract/SignaturePad.tsx` | 전자서명 캔버스 래퍼 |
| `components/job-postings/ContractLinkModal.tsx` | QR 코드 + 링크 모달 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `lib/supabase/types.ts` | Assignment 타입에 contract 필드 추가 |
| `app/(dashboard)/job-postings/[id]/page.tsx` | 계약 링크/QR 버튼 추가 |
| `components/job-postings/AssignedWorkersTable.tsx` | 계약 상태 컬럼 + 승인 버튼 추가 |
| `app/api/assignments/route.ts` | select에 contract 필드 추가 |
| `app/api/assignments/[id]/route.ts` | PUT에서 contract_status 업데이트 지원 |
| `middleware.ts` | `/contract` 경로 인증 제외 |
