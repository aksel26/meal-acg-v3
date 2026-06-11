# 직원 인사·급여 정보 암호화 설계

- 작성일: 2026-06-11
- 상태: 설계 확정 (구현 대기)
- 대상 앱: `apps/admin` (입력·관리), `apps/user` (본인 열람)

## 1. 배경 / 문제

대표가 직원 개개인의 **연봉·주민등록번호 등 민감 인사정보**에 대해 다음을 요구한다.

1. **본인만** 자신의 정보를 확인할 수 있다.
2. DB에 **암호화되어 저장**되어, DB를 직접 조회하는 **개발팀도 평문을 볼 수 없다**.

반면 식대·이름·전화번호·식사기록 등 비민감 정보는 현행대로 평문으로 둔다(범위 밖).

현재 코드 기준 사실:
- 정규 직원은 `public.members` 테이블에 있으며 **로그인 계정이 있다**(HMAC-SHA256 세션 쿠키, `getSessionUser()`).
- 비밀번호는 이미 bcrypt 단방향 해싱 적용됨(`20260527120000_hash_member_passwords.sql`).
- **연봉·주민번호 등 인사정보 컬럼은 아직 존재하지 않는다** — 신규 추가 대상.
- 별개로 `supervisor.workers.resident_id`(지원자 주민번호)가 평문 저장되나, 이번 범위 밖.

## 2. 목표 / 비목표

### 목표
- `members`의 인사·급여 민감 3종 필드(**주민등록번호, 연봉/급여, 계좌번호**)를 DB에 암호문으로만 저장.
- 복호화는 **본인** 또는 **인가자(대표/인사담당)** 의 인증된 API 요청에서만 수행.
- DB 직접 조회(SQL/덤프/Supabase 대시보드)로는 평문 획득 불가.

### 비목표 (이번 범위 제외)
- 지원자(`supervisor.workers`) 주민번호/계좌 암호화.
- 완전 E2E(직원 비밀번호 파생키) — 비번 분실 시 영구 소실 + 인사팀 조회 불가로 운영과 충돌하여 채택하지 않음.
- 식대·이름·전화번호·식사기록 등 비민감 정보 암호화.
- 채용 이력서 파일 업로드 기능(현재 미존재, 추후 별도 스펙).

## 3. 확정된 결정

| 항목 | 결정 |
|---|---|
| 암호화 대상 | `members`의 인사정보 — 주민등록번호, 연봉/급여, 계좌번호(은행명 포함) |
| 열람 권한 | 본인 + 인가자. 단 **연봉은 본인 + 대표(`owner`)만** 열람 |
| 키 모델 | 서버 보유 단일 마스터키, 앱 레벨 **AES-256-GCM** |
| 키 보관 | A안 — Vercel 환경변수 단일키 `HR_ENCRYPTION_KEY` (env 접근은 대표만 허용) |
| 인가자 식별 | `members.hr_role` enum — `none`/`staff`/`owner` 3단계 (기존 `role=admin`과 분리) |
| 입력 권한 | 인가자만 입력·수정(연봉은 대표만), 본인은 열람만 |
| 권한 부여 | `hr_role` 부여·변경은 대표(`owner`)만 가능 |

### 권한 매트릭스

| 작업 | none | staff(인사담당) | owner(대표) | 본인 |
|---|---|---|---|---|
| 주민번호·계좌 — 마스킹 조회 | ✗ | ✓ | ✓ | ✓(자기 것) |
| 주민번호·계좌 — 전체 노출 | ✗ | ✓ | ✓ | ✓(클릭) |
| 연봉 — 조회 / 전체 노출 | ✗ | ✗ | ✓ | ✓(클릭, 자기 것) |
| 입력·수정 (주민번호·계좌) | ✗ | ✓ | ✓ | ✗ |
| 입력·수정 (연봉) | ✗ | ✗ | ✓ | ✗ |
| `hr_role` 부여·변경 | ✗ | ✗ | ✓ | ✗ |

## 4. 데이터 모델

민감정보를 `members`에 직접 붙이지 않고 **별도 테이블로 격리**한다. 일반 직원 조회/목록 쿼리에 민감정보가 섞이지 않도록 관심사를 분리한다.

```sql
-- 1) 인가자 등급 (none=권한없음, staff=인사담당, owner=대표)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS hr_role text NOT NULL DEFAULT 'none'
  CHECK (hr_role IN ('none', 'staff', 'owner'));

-- 2) 민감정보 격리 테이블 (암호문만 저장)
CREATE TABLE IF NOT EXISTS public.member_hr_profiles (
  member_id        uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  resident_id_enc  text,        -- AES-256-GCM 암호문, "v1:<base64>"
  salary_enc       text,        -- 연봉/급여 (문자열로 직렬화 후 암호화)
  account_enc      text,        -- {bank, number} JSON 직렬화 후 암호화
  updated_by       uuid REFERENCES public.members(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS: service_role 전용 (정책 미생성 = 일반 롤 기본 거부, service_role은 RLS 우회)
ALTER TABLE public.member_hr_profiles ENABLE ROW LEVEL SECURITY;
```

- 모든 앱 접근은 `createServiceClient()`(service_role)로 수행하고, **열람 가능 여부는 전적으로 API 레이어에서 판단**한다.
- 계좌번호는 은행명과 한 세트이므로 `{ "bank": "...", "number": "..." }` JSON으로 묶어 `account_enc` 하나에 암호화한다.

마이그레이션 파일: `supabase/migrations/20260611_member_hr_profiles.sql`
(타입 재생성: `apps/admin/lib/supabase/types.ts` 및 `apps/user/lib/supabase/types.ts` 갱신)

## 5. 암호화 모듈

위치: 각 앱 `lib/hr-crypto.ts` (상단 `import "server-only"`). 두 앱에서 동일 구현을 쓰므로, 중복을 피하려면 `@repo/utils`의 server 전용 서브경로로 두는 안을 구현 시 검토한다. **단, 키는 각 앱 런타임 env에서 읽는다.**

### 키
- 환경변수 `HR_ENCRYPTION_KEY`: 32바이트 키를 base64 인코딩한 문자열.
- 생성: `openssl rand -base64 32`
- bcrypt 세션 서명키(`SESSION_SECRET`)와 **반드시 별도**.

### 포맷
```
출력 = "v1:" + base64( IV(12 bytes) || authTag(16 bytes) || ciphertext )
```
- 알고리즘: `aes-256-gcm` (Node 내장 `crypto`, 추가 의존성 없음)
- IV: `crypto.randomBytes(12)` (요청·레코드마다 새로 생성)
- `v1:` 접두사 = 키 버전. 키 회전 시 `v2:` 등으로 구분.

### 인터페이스
```ts
export function encryptField(plain: string): string;        // → "v1:..."
export function decryptField(enc: string | null): string | null;  // 복호화, authTag 검증 실패 시 throw
```
- `decryptField`는 `authTag` 불일치(변조) 시 예외 → API는 500 + 감사 경고.
- `null`/빈 값은 그대로 통과(미입력 필드 허용).

## 6. 권한 · 복호화 흐름

### 권한 헬퍼
```ts
// 세션 멤버의 hr_role 조회: 'none' | 'staff' | 'owner'
async function getHrRole(session): Promise<'none' | 'staff' | 'owner'>
```
필드별 접근 규칙:
- **주민번호·계좌**: `staff` 또는 `owner`. (본인이면 자기 것은 항상 가능)
- **연봉**: `owner`만. (`staff`는 불가, 본인이면 자기 것은 가능)
- **입력·수정**: 주민번호·계좌는 `staff`/`owner`, 연봉은 `owner`만. 본인 입력 불가.

### API 명세

**입력·수정 (admin 앱)**
- `PUT /api/members/[id]/hr-profile`
  - 가드: `getHrRole(session)`이 `staff` 또는 `owner`. 아니면 `403`.
  - 본문: `{ residentId?, account?: {bank, number}, salary? }` (평문, HTTPS).
  - **필드별 권한**: `salary`가 본문에 있는데 `owner`가 아니면 `403`.
  - 처리: 허용된 필드만 `encryptField` → `member_hr_profiles` upsert, `updated_by = session.userId`.

**인가자 열람 (admin 앱)**
- `GET /api/members/[id]/hr-profile?reveal=<bool>`
  - 가드: `getHrRole(session)`이 `staff`/`owner`. 아니면 `403`.
  - 반환 필드는 등급에 따름: `staff`는 주민번호·계좌만, `owner`는 연봉 포함 전부.
  - `reveal=false`(기본): 마스킹. `reveal=true`: 전체 평문 + **감사 로그**.

**본인 열람 (user 앱)**
- `GET /api/users/me/hr-profile?reveal=<bool>`
  - 가드: 세션 존재. 대상은 **항상 `session.userId` 자신** (경로에 타인 id 불가).
  - 본인은 자기 **전 필드(연봉 포함)** 열람. 마스킹 기본, `reveal=true`(클릭) 시 전체 + 감사 로그.

### 권한 부여 (admin 앱, 대표 전용)
- `PUT /api/members/[id]/hr-role`
  - 가드: `getHrRole(session) === 'owner'`. 아니면 `403`.
  - 본문: `{ hr_role: 'none' | 'staff' | 'owner' }`.

### 핵심 불변식
- 복호화(`decryptField`)는 위 열람 엔드포인트의 가드를 통과한 경우에만 호출된다.
- 목록·대시보드·통계 등 **다른 어떤 경로에서도 `member_hr_profiles`를 SELECT 하지 않는다** → 평문이 메모리에 올라오는 지점을 한정.

## 7. 마스킹

기본 응답은 마스킹, 명시적 `reveal=true`에서만 전체 노출.

| 필드 | 마스킹 예시 |
|---|---|
| 주민등록번호 | `901010-1******` (뒷자리 마스킹) |
| 연봉/급여 | 기본 숨김(`•••`), **대표·본인만** "보기" 클릭 시 전체 노출 |
| 계좌번호 | `국민 ****-**-**1234` (뒤 4자리만) |

화면에서 "전체 보기" 클릭 → `reveal=true` 호출 → 감사 로그 1건.

## 8. 감사 로그 (전체 노출 시)

`reveal=true` 호출 시에만 1건 기록(누가 / 누구 정보를 / 언제). 일상적 마스킹 조회는 로깅하지 않는다.

```sql
CREATE TABLE IF NOT EXISTS public.hr_access_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id   uuid NOT NULL REFERENCES public.members(id),
  target_id   uuid NOT NULL REFERENCES public.members(id),
  fields      text[],          -- 노출된 필드명
  is_self     boolean,         -- 본인 열람 여부
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## 9. 키 운영

- **양방향 암호화이므로 키가 곧 전부**다. bcrypt(단방향) 비밀번호와 본질적으로 다르다.
  - `HR_ENCRYPTION_KEY` 분실 → 전 데이터 복호화 영구 불가.
  - `HR_ENCRYPTION_KEY` 유출 → (DB 암호문까지 가진 경우) 전 데이터 유출.
- 대표가 키를 비밀번호 관리자 등 **안전한 곳에 별도 백업** 보관(필수 운영 절차).
- Vercel env의 `HR_ENCRYPTION_KEY` **접근 권한은 대표만** 부여 → A안의 잔여 리스크(env 접근 개발자) 통제.
- 회전 절차(추후): 새 키 `v2` 추가 → 전 레코드 복호(`v1`)·재암호(`v2`) 배치 → `v1` 폐기.

## 10. 위협 모델

| 막아주는 것 ✅ | 못 막는 것 ⚠️ (보완책) |
|---|---|
| 개발자가 Supabase 대시보드·SQL·DB 덤프로 직접 조회 | Vercel **env 접근권**을 가진 개발자 → env 접근을 대표만 허용 |
| DB 백업 파일 유출 | 서버 **코드를 배포**할 수 있는 개발자가 복호화 API를 악용 → 배포 권한 통제 + 감사 로그 |
| 일반 직원의 타인 인사정보 열람 | 메모리/런타임 침해(인프라 레벨) → Vercel·Supabase 인프라 보안에 의존 |

## 11. 구현 작업 분해 (개요)

1. 마이그레이션: `member_hr_profiles`, `members.hr_role`, `hr_access_logs` + 타입 재생성.
2. `lib/hr-crypto.ts` (AES-256-GCM encrypt/decrypt) — admin·user 양쪽.
3. 권한 헬퍼 `getHrRole()` + 필드별 접근 규칙 — admin·user 양쪽.
4. admin API: `PUT`/`GET /api/members/[id]/hr-profile` (필드별 권한) + `PUT /api/members/[id]/hr-role` + 마스킹·감사.
5. user API: `GET /api/users/me/hr-profile` + 마스킹·감사.
6. admin UI: (a) 인사정보 입력·열람 화면(staff+owner, 연봉은 owner만), (b) **인사권한 관리 화면 — 대표(owner)만**, 멤버별 `hr_role` 지정.
7. user UI: 본인 "내 정보" 열람 화면(마스킹 + 전체 보기).
8. env 문서화: `HR_ENCRYPTION_KEY` 생성·등록 안내, `.env.local` 예시.
9. 검증: 비인가자 403, DB 직접 조회 시 암호문 확인, 변조 authTag 감지, `pnpm check-types` / `pnpm lint`.

## 12. 미해결 / 추후

- 최초 `owner`(대표)는 마이그레이션 또는 수동 SQL로 1회 지정 — 구현 시 대상 멤버 확정.
- 향후 B안(Vault/KMS) 승격 시점 — 운영 중 개발자 수 증가하면 재검토.
