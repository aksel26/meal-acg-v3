# 직원 인사·급여 정보 암호화 설계

- 작성일: 2026-06-11 (재정의: 기존 RBAC/감사 인프라 재활용)
- 상태: 설계 확정 (구현 대기)
- 대상 브랜치: `feat/hr-data-encryption` (← `feat/attendance-check-in-out` 기반)
- 대상 앱: `apps/admin` (입력·관리), `apps/user` (본인 열람)

## 1. 배경 / 문제

대표가 직원 개개인의 **연봉·주민등록번호·계좌 등 민감 인사정보**에 대해 요구한다.

1. **본인만** 자신의 정보를 확인할 수 있다.
2. DB에 **암호화되어 저장**되어, DB를 직접 조회하는 **개발팀도 평문을 볼 수 없다**.
3. 식대·이름·전화번호·식사기록 등 비민감 정보는 현행대로 평문(범위 밖).

### 현재 코드 기준 사실 (attendance 브랜치)

이미 구축되어 **재활용할 자산**:
- **RBAC**: `apps/admin/lib/rbac.ts`에 `members:sensitive:read`/`members:sensitive:write` 권한(그룹 "민감정보/다운로드", highRisk), 역할 `대표`/`팀장`/`일반`, DB 권한정책(`admin_role_permission_policies`) + 멤버별 override(`admin_member_permission_overrides`), 권한 헬퍼 `requireAdminPermission()`/`hasEffectiveAdminPermission()`/`requireRepresentativeAdmin()`.
- **권한 관리 화면**: 이미 존재(`rbac:manage`, 대표 전용). 새 권한을 `ADMIN_PERMISSIONS`에 추가하면 자동 노출.
- **감사 로깅**: `admin_audit_logs` 테이블 + `writeAdminAuditLog()`(actor/action/target/riskLevel/reason/metadata). 민감정보 조회 시 사유 입력 UX 존재.
- **민감정보 조회 UI 골격**: `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx` — 연봉(`annualSalary`)·적용일·비고 표시 + 열람 사유 입력. 현재 `/api/members/[id]/sensitive/route.ts`는 **빈 스텁**(`annualSalary: null, registered: false`)을 반환.
- **본인 식별**: `apps/user/lib/auth.ts`의 `getSessionUser()` → `{ id, fullName, role }` (HMAC 서명 세션 쿠키 `acg_session`). 비밀번호는 bcrypt(`20260527120000_hash_member_passwords.sql`).

아직 없는 것 = **이번 작업의 핵심**:
- **민감정보 저장소**: `public.members`에 연봉/주민번호/계좌 컬럼이 전혀 없음(전부 신규). 연봉은 스텁만 존재.
- **DB 암호화**: 저장 시 암호화하는 레이어 없음.
- **본인 열람**: user 앱에 자기 인사정보 조회 경로 없음.

## 2. 목표 / 비목표

### 목표
- 직원(`members`)의 민감 3종 — **주민등록번호, 연봉, 계좌(은행명+번호)** — 를 DB에 **AES-256-GCM 암호문으로만** 저장.
- 복호화는 **본인** 또는 **인가된 관리자**의 인증된 API에서만 수행.
- DB 직접 조회(SQL/덤프/Supabase 대시보드)로는 평문 획득 불가.
- 기존 RBAC·감사·민감정보 UI 골격을 **재활용**(중복 신설 금지).

### 비목표
- 지원자(`supervisor.workers`) 데이터 — 사용자가 범위 제외.
- 완전 E2E(직원 비밀번호 파생키) — 비번 분실 시 영구 소실 + 인사팀 조회 불가로 채택 안 함.
- 식대·이름·전화번호·주소·식사기록 등 비민감 정보.
- 새 `hr_role` enum, 새 감사 테이블, 새 권한 관리 화면 — **기존 자산으로 대체**.

## 3. 확정된 결정

| 항목 | 결정 |
|---|---|
| 암호화 대상 | 주민등록번호, 연봉, 계좌(은행명+번호) |
| 저장 위치 | **`public.member_hr_profiles` 격리 테이블** (암호문 전용) |
| 암호화 | 앱 레벨 **AES-256-GCM** (Node 내장 `crypto`, 의존성 0) |
| 키 보관 | A안 — env 단일키 `HR_ENCRYPTION_KEY` (접근은 대표만) |
| 주민번호·계좌 권한 | 기존 `members:sensitive:read` / `members:sensitive:write` (인사담당+대표) |
| 연봉 권한 | **신규** `members:salary:read` / `members:salary:write` (대표 전용 기본) |
| 권한 부여 | 기존 권한 관리 화면(`rbac:manage`, 대표) — 신규 권한 자동 노출 |
| 본인 열람 | user 앱 `getSessionUser()` 기반, 자기 전 필드(연봉 포함) |
| 입력 권한 | 위 권한 보유 관리자만, 본인은 열람만 |
| 감사 | 기존 `admin_audit_logs` + `writeAdminAuditLog()` 재활용 |

### 권한 매트릭스

| 작업 | 일반(admin) | 팀장(admin) | 대표 | 본인(user) |
|---|---|---|---|---|
| 주민번호·계좌 — 조회 | 권한 정책 따름 (`members:sensitive:read`) | 〃 | ✓ | ✓(자기 것) |
| 주민번호·계좌 — 입력 | `members:sensitive:write` | 〃 | ✓ | ✗ |
| 연봉 — 조회 | ✗ | ✗ | ✓ (`members:salary:read`) | ✓(자기 것) |
| 연봉 — 입력 | ✗ | ✗ | ✓ (`members:salary:write`) | ✗ |
| 권한 부여 | ✗ | ✗ | ✓ (`rbac:manage`) | ✗ |

> 기본 역할 권한: `members:sensitive:*`는 권한 정책/override로 인사담당에게 부여. `members:salary:*`는 **대표(REPRESENTATIVE) 역할에만** 기본 포함, 팀장·일반 기본 세트에서 제외.

## 4. 데이터 모델

```sql
-- 민감정보 격리 테이블 (암호문 전용)
CREATE TABLE IF NOT EXISTS public.member_hr_profiles (
  member_id            uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  resident_id_enc      text,        -- "v1:<base64>"  (주민등록번호)
  account_enc          text,        -- "v1:<base64>"  ({bank, number} JSON 암호화)
  salary_enc           text,        -- "v1:<base64>"  (연봉, 숫자 문자열 암호화)
  salary_effective_date date,       -- 연봉 적용일 (평문, 날짜만으론 저민감)
  salary_note          text,        -- 비고 (평문)
  updated_by           uuid REFERENCES public.members(id),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- RLS: service_role 전용 (정책 미생성 = 일반 롤 기본 거부; service_role은 RLS 우회)
ALTER TABLE public.member_hr_profiles ENABLE ROW LEVEL SECURITY;
```

- 모든 접근은 `createServiceClient()`로 수행, **열람 가능 여부는 전적으로 API 레이어**에서 판단.
- 계좌는 `{ "bank": "...", "number": "..." }` JSON으로 묶어 `account_enc` 하나에 암호화.
- 마이그레이션 파일: `supabase/migrations/20260611_member_hr_profiles.sql`
- 타입 재생성: `apps/admin/lib/supabase/types.ts`, `apps/user/lib/supabase/types.ts`

## 5. 암호화 모듈

위치: `apps/admin/lib/hr-crypto.ts`, `apps/user/lib/hr-crypto.ts` (동일 구현, 각 상단 `import "server-only"`).

### 키
- `HR_ENCRYPTION_KEY`: 32바이트 키를 base64 인코딩한 문자열. `SESSION_SECRET`과 별도.
- 생성: `openssl rand -base64 32`

### 포맷
```
출력 = "v1:" + base64( IV(12 bytes) || authTag(16 bytes) || ciphertext )
```
- 알고리즘 `aes-256-gcm`. IV는 `crypto.randomBytes(12)`(레코드/요청마다 새로). `v1:` = 키 버전.

### 인터페이스
```ts
export function encryptField(plain: string): string;               // → "v1:..."
export function decryptField(enc: string | null): string | null;   // authTag 불일치 시 throw
```
- `null`/빈 값은 그대로 통과(미입력 허용). 변조(authTag 불일치)는 예외 → API 500 + 감사 경고.

## 6. 권한 모델 (기존 RBAC 확장)

### `apps/admin/lib/rbac.ts` 변경
1. `ADMIN_PERMISSIONS` 배열에 추가: `"members:salary:read"`, `"members:salary:write"`.
2. `ADMIN_PERMISSION_METADATA`에 추가(그룹 `"민감정보/다운로드"`, `highRisk: true`): 라벨 "직원 연봉 조회"/"직원 연봉 수정".
3. 역할 기본권한:
   - `REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS` → 대표는 자동 포함.
   - `ADMIN_LEADER_PERMISSIONS`(팀장): 기존 `filter(p !== "rbac:manage")`에 **`&& p !== "members:salary:read" && p !== "members:salary:write"`** 추가 → 팀장도 연봉 제외.
   - `ADMIN_MEMBER_PERMISSIONS`(일반): 연봉 권한 미포함(이미 목록에 없음).

### 권한 체크 헬퍼 (기존 사용)
- 주민번호·계좌 조회: `requireAdminPermission("members:sensitive:read")`
- 주민번호·계좌 입력: `requireAdminPermission("members:sensitive:write")`
- 연봉 조회: `requireAdminPermission("members:salary:read")`
- 연봉 입력: `requireAdminPermission("members:salary:write")`
- 본인 열람(user): `getSessionUser()` → null이면 401, 대상은 항상 자신.

## 7. API 명세

### admin: 민감정보 조회 (기존 route 확장)
`POST /api/members/[id]/sensitive` — 현재 스텁을 실제 구현으로 교체.
- 가드: `requireAdminPermission("members:sensitive:read")` (기존).
- `member_hr_profiles`에서 행 조회 → `resident_id_enc`, `account_enc` 복호화.
- **연봉은 별도 권한**: `hasEffectiveAdminPermission(session, "members:salary:read")`가 true일 때만 `salary_enc` 복호화하여 포함, 아니면 연봉 필드 생략/마스킹.
- 기존대로 `reason` 필수 + `writeAdminAuditLog({ action: "member.sensitive_view", riskLevel: "high", reason, metadata:{fields} })`.

### admin: 민감정보 입력·수정 (신규)
`PUT /api/members/[id]/hr-profile`
- 본문: `{ residentId?, account?: {bank, number}, salary?, salaryEffectiveDate?, salaryNote? }` (평문, HTTPS).
- 가드(필드별):
  - `residentId`/`account` 포함 시 `requireAdminPermission("members:sensitive:write")`.
  - `salary`/`salaryEffectiveDate`/`salaryNote` 포함 시 `requireAdminPermission("members:salary:write")`.
  - 권한 없는 필드가 본문에 있으면 `403`.
- 처리: 허용 필드만 `encryptField` → `member_hr_profiles` upsert(`updated_by = session.userId`).
- `writeAdminAuditLog({ action: "member.hr_update", riskLevel: "high", metadata:{fields} })`.

### user: 본인 열람 (신규)
`GET /api/users/me/hr-profile?reveal=<bool>`
- 가드: `getSessionUser()`; null이면 401. 대상은 **항상 `session.id` 자신**(타인 id 불가).
- 본인은 자기 **전 필드(연봉 포함)** 열람. `reveal=false`(기본) 마스킹, `reveal=true` 전체 평문 + 감사 로그.

### 핵심 불변식
- `decryptField`는 위 엔드포인트의 가드를 통과한 경우에만 호출.
- 목록·대시보드·통계 등 다른 어떤 경로도 `member_hr_profiles`를 SELECT 하지 않는다.

## 8. 마스킹

기본 마스킹, 명시적 `reveal=true`에서만 전체 노출.

| 필드 | 마스킹 예 |
|---|---|
| 주민등록번호 | `901010-1******` |
| 연봉 | `•••` (대표·본인만 "보기" 클릭 시 전체) |
| 계좌 | `국민 ****-**-**1234` |

## 9. 감사 (기존 admin_audit_logs 재활용)

- admin 조회/수정: `writeAdminAuditLog()`로 기록(이미 사유 입력 UX 존재). `member.sensitive_view`(기존), `member.hr_update`(신규).
- user 본인 `reveal=true`: 동일 테이블에 `action: "member.self_hr_view"`, `riskLevel: "low"`, `actorId = 본인`으로 기록. (user 앱에서 `admin_audit_logs` insert는 service client로 수행)

## 10. 키 운영

- **양방향 암호화 → 키가 곧 전부.** bcrypt(단방향) 비밀번호와 다르다.
  - `HR_ENCRYPTION_KEY` 분실 → 전 데이터 복호화 영구 불가. 유출 → 전 데이터 유출.
- 대표가 키를 **비밀번호 관리자 등에 별도 백업**(필수 운영 절차). env 접근 권한은 대표만.
- 회전(추후): `v2` 키 추가 → 전 레코드 복호(`v1`)·재암호(`v2`) 배치 → `v1` 폐기.

## 11. 위협 모델

| 막아주는 것 ✅ | 못 막는 것 ⚠️ (보완책) |
|---|---|
| 개발자가 Supabase 대시보드·SQL·DB 덤프로 직접 조회 | env 접근권 가진 개발자 → env 접근을 대표만 |
| DB 백업 파일 유출 | 서버 코드 배포 가능한 개발자가 복호화 API 악용 → 배포 권한 통제 + 감사 로그 |
| 일반 직원의 타인 인사정보 열람 | 메모리/런타임 침해 → 인프라 보안 의존 |
| 권한 없는 관리자의 연봉 열람 (members:salary 분리) | — |

## 12. 구현 작업 분해 (개요)

1. **마이그레이션**: `member_hr_profiles` 테이블 + `members:salary:*` 권한을 `admin_role_permission_policies`에 대표 허용 seed(또는 fallback 권한만으로 충분하면 생략) + 타입 재생성.
2. **rbac.ts**: `members:salary:read/write` 추가(배열·메타데이터·팀장 제외 필터).
3. **hr-crypto.ts**: AES-256-GCM `encryptField`/`decryptField` — admin·user 양쪽.
4. **admin API**: `sensitive/route.ts` 실제 구현(복호화 + 연봉 권한 분리) + `hr-profile` PUT(필드별 권한·암호화·감사).
5. **user API**: `users/me/hr-profile` GET(본인·마스킹·감사).
6. **admin UI**: 멤버 상세 페이지에 입력 폼 + 조회값을 복호화 응답에 연결(기존 골격 활용).
7. **user UI**: 본인 "내 정보" 열람(마스킹 + 보기).
8. **env**: `HR_ENCRYPTION_KEY` 생성·등록 안내 + 양쪽 `.env.local` 예시.
9. **검증**: 권한별 403, DB 직접 조회 시 암호문 확인, authTag 변조 감지, `pnpm check-types`/`pnpm lint`.

## 13. 미해결 / 추후

- `members:salary:*`를 권한정책 테이블에 seed할지(대표는 코드상 항상 전체 권한이라 seed 없이도 동작) — 구현 시 확인.
- 연봉 적용일/비고의 민감도 — 우선 평문, 필요 시 암호화 승격.
- 향후 B안(Vault/KMS) 승격 — 운영 중 개발자 수 증가 시 재검토.
