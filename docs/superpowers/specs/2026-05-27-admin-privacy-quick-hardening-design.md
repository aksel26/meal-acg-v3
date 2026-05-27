# 어드민 개인정보 빠른 보안 강화 설계

작성일: 2026-05-27

## 목적

대표가 우려하는 지점은 개발자나 관리자가 운영 DB와 어드민 기능을 통해 직원의 개인정보, 급여성 정보, 재무 정보, 근태 정보를 과도하게 볼 수 있다는 점이다. 1차 목표는 기존 어드민 업무 흐름을 크게 바꾸지 않으면서 불필요한 민감정보 노출을 줄이고, 꼭 필요한 접근은 권한과 감사 로그로 설명 가능한 상태를 만드는 것이다.

이번 설계는 빠른 신뢰 확보용 보안 강화안이다. 운영 DB 접근 차단, 개발 DB 마스킹, 필드 암호화, SSO 고도화는 후속 단계로 남기고, 현재 어드민 앱에서 바로 효과가 큰 API 응답 축소, 권한 적용 확대, 다운로드/민감정보 접근 로그를 우선한다.

## 현재 코드 기준 관찰

- 어드민 앱은 Next.js App Router 기반이며 `apps/admin/app/api/**/route.ts`에서 서버 API를 운영한다.
- 인증은 `admin-session` 쿠키와 `requireAdmin()` / `requireAdminPermission()`으로 처리한다.
- RBAC는 `apps/admin/lib/rbac.ts`에 `대표`, `P&C 팀장`, `P&C 일반`으로 이미 구분되어 있다.
- `apps/admin/lib/supabase/server.ts`의 `createServiceClient()`는 service role key로 RLS를 우회한다. 따라서 API 계층의 권한 검증과 응답 필드 제한이 중요하다.
- `GET /api/members`는 현재 `members.*`를 조회한다. 멤버 목록 응답에 생년월일, 전화번호, 여권번호, password 등 민감하거나 불필요한 필드가 섞일 위험이 있다.
- 조직도 API는 `email`, `birth_date`를 내려준다. 조직도 기본 화면의 목적에 비해 식별정보가 넓게 노출된다.
- 엑셀/대량 다운로드 API는 권한 체크가 일부 있으나, 다운로드 사유와 감사 로그가 표준화되어 있지 않다.
- 재무 도메인은 `finance_audit_logs` 테이블이 있지만, 모든 변경 API가 일관되게 로그를 남기는 구조는 아니다.

## 범위

### 포함

- 어드민 API 응답 필드 최소화
- 민감정보 기본 마스킹 정책 정의
- 다운로드, 민감정보 조회, 권한 변경 감사 로그 설계
- 기존 RBAC에 위험 행위 권한을 추가하는 방향 설계
- 대표 설명용 운영 원칙 문서화

### 제외

- 실제 데이터 암호화 구현
- Supabase Auth 또는 SSO 전환
- 운영 DB 접속 절차/인프라 자동화
- 개발/스테이징 DB 마스킹 파이프라인 구현
- 전 직원 권한 모델 전면 재설계

## 민감도 분류

| 등급 | 예시 | 기본 정책 |
| --- | --- | --- |
| 일반 | 이름, 부서, 직책, 재직 상태 | 업무 화면에 표시 가능 |
| 내부 | 이메일, 입사일, 조직 이동 이력, 근태 요약 | 목적이 있는 화면에만 표시 |
| 민감 | 전화번호, 생년월일, 휴가/근태 상세 사유, 정산 상세 | 기본 마스킹, 권한 있는 상세 화면에서만 표시 |
| 고위험 | 여권번호, 주민번호성 식별자, 계좌, 비밀번호, 급여/보상 | 원칙적으로 응답 금지, 필요 시 별도 권한과 감사 로그 |

현재 코드에서 즉시 주의할 필드는 `members.password`, `members.passport_number`, `members.birth_date`, `members.phone`, `members.email`, 재무 금액 필드, 엑셀 다운로드 결과물이다.

## 접근 방식

추천안은 "최소 노출 + 민감정보 열람 로그"다. 기존 기능을 유지하되, 기본 응답은 안전하게 줄이고, 다운로드나 전체값 열람처럼 위험도가 높은 행위는 로그를 남긴다.

대안 1인 최소 노출 패치는 빠르지만 대표에게 설명할 증적이 부족하다. 대안 3인 권한체계 전면 세분화는 이상적이지만 1차 작업으로는 영향 범위가 크다. 따라서 1차는 응답 축소와 감사 로그를 우선하고, 권한 세분화는 위험 API부터 점진 적용한다.

## API 설계

### 멤버 목록

`GET /api/members`는 `members.*`를 사용하지 않는다. 목록 화면에 필요한 필드만 명시한다.

기본 반환 후보:

- `id`
- `login_id`
- `full_name`
- `role`
- `admin_role`
- `user_authority`
- `member_role`
- `team_id`
- `team_name`
- `division_id`
- `organization_id`
- `position_id`
- `title_id`
- `intern_months`

목록 응답에서 제외:

- `password`
- `passport_number`
- `birth_date`
- `phone`
- `note`
- 불필요한 타임스탬프와 내부 관리 필드

`email`은 알림/Slack 대상 선택처럼 목적이 분명한 API에서만 별도 반환한다. 범용 멤버 목록에는 기본 포함하지 않는다.

### 멤버 상세

`GET /api/members/[id]`는 상세 수정 화면 전용으로 유지하되, `members:write`만으로 고위험 필드를 모두 내려주지 않는다. 상세 응답은 두 단계로 나눈다.

- 일반 상세: 이름, 조직, 직책, 권한, 이메일 일부 또는 전체
- 민감 상세: 생년월일, 전화번호, 여권번호 등

민감 상세가 필요한 경우에는 별도 API 또는 query flag를 사용한다. 해당 API는 `members:sensitive:read` 권한과 감사 로그를 요구한다.

### 조직도

조직도 API는 기본적으로 이름, 직책, 팀, 부서, 재직/역할 정보만 내려준다.

`birth_date`는 기본 제외한다. 생일 표시가 필요하다면 월일만 계산된 값으로 제공하거나, 별도 설정과 권한을 둔다. `email`은 조직도에서 직접 노출하지 않고, 연락 기능이 있는 화면에서만 제한적으로 조회한다.

### 다운로드

다음 API는 다운로드 감사 로그 대상이다.

- `GET /api/export/member`
- `GET /api/export/members-bulk`
- `GET /api/export/excel`
- `GET /api/export/usage-records`
- 재무 리포트 다운로드가 추가될 경우 해당 API

다운로드 로그에는 actor, 대상 범위, 기간, 파일 종류, 건수, 사유, 요청 IP, user-agent, 생성 시각을 기록한다. 1차 구현에서는 사유를 선택 입력으로 시작할 수 있지만, 대량 다운로드와 민감 필드 포함 다운로드는 사유를 필수로 한다.

## 권한 설계

기존 권한을 유지하면서 위험 행위용 권한을 추가한다.

- `members:sensitive:read`
- `members:sensitive:write`
- `export:bulk`
- `audit:read`

권장 배정:

| 권한 | 대표 | P&C 팀장 | P&C 일반 |
| --- | --- | --- | --- |
| `members:sensitive:read` | 허용 | 허용 | 제한 |
| `members:sensitive:write` | 허용 | 허용 | 제한 |
| `export:bulk` | 허용 | 허용 | 제한 |
| `audit:read` | 허용 | 허용 | 제한 |

`P&C 일반`은 업무상 필요한 등록/수정은 가능하되, 고위험 필드 전체값 조회와 대량 다운로드는 제한하는 방향이 기본값이다. 실제 운영상 P&C 일반에게 필요한 업무가 있으면 특정 화면/API만 예외로 열어준다.

## 감사 로그 설계

공통 테이블 `admin_audit_logs`를 추가한다.

필드 후보:

- `id uuid`
- `actor_id uuid`
- `actor_name text`
- `action text`
- `target_type text`
- `target_id text`
- `target_label text`
- `risk_level text`
- `reason text`
- `metadata jsonb`
- `request_path text`
- `ip_address text`
- `user_agent text`
- `created_at timestamptz`

로그 대상 액션:

- `member.sensitive_view`
- `member.sensitive_update`
- `member.permission_update`
- `export.member`
- `export.members_bulk`
- `export.usage_records`
- `finance.report_view`
- `finance.record_update`

감사 로그는 원문 민감정보를 그대로 저장하지 않는다. `before/after`가 필요한 경우 필드명과 변경 여부, 마스킹된 값, 요약 값만 저장한다.

## UI 설계

1차 UI 변화는 작게 유지한다.

- 멤버 목록과 조직도에서는 생년월일, 전화번호, 여권번호를 기본 표시하지 않는다.
- 민감정보가 필요한 상세 화면에는 "민감정보 보기" 버튼을 둔다.
- 클릭 시 사유 입력 다이얼로그를 표시하고, 권한이 있을 때만 전체값을 조회한다.
- 다운로드 버튼은 대량 또는 민감 다운로드일 때 사유 입력을 요구한다.
- 감사 로그 조회 화면은 1차 구현에서는 대표/P&C 팀장용 간단 목록으로 충분하다.

## 데이터 흐름

1. 사용자가 어드민 화면에 접근한다.
2. API route가 `requireAdmin()` 또는 `requireAdminPermission()`으로 세션과 권한을 확인한다.
3. API는 화면 목적에 맞는 명시 컬럼만 조회한다.
4. 민감정보 전체값이 필요한 경우 별도 endpoint가 권한과 사유를 확인한다.
5. 민감 조회/다운로드/권한 변경은 `admin_audit_logs`에 기록한다.
6. 클라이언트는 기본 화면에서 마스킹 또는 축소된 값만 렌더링한다.

## 에러 처리

- 권한이 없으면 403과 한국어 메시지 `권한이 없습니다.`를 반환한다.
- 사유가 필요한데 없으면 400과 `사유를 입력해주세요.`를 반환한다.
- 감사 로그 기록 실패는 보수적으로 처리한다. 민감정보 조회와 다운로드는 로그 기록에 실패하면 요청도 실패시키는 것을 기본값으로 한다.
- 일반 목록 조회는 감사 로그 없이 동작하되, 고위험 필드는 응답하지 않는다.

## 테스트 전략

- `GET /api/members` 응답에 `password`, `passport_number`, `birth_date`, `phone`이 없는지 확인한다.
- 조직도 API 응답에 `birth_date`가 기본 포함되지 않는지 확인한다.
- 권한 없는 세션이 민감정보 조회 API에 접근하면 403인지 확인한다.
- 민감정보 조회 성공 시 `admin_audit_logs`에 기록되는지 확인한다.
- 대량 다운로드에서 사유 누락 시 400인지 확인한다.
- 기존 멤버 등록/수정, 조직도, 엑셀 다운로드 주요 흐름이 깨지지 않는지 확인한다.

검증 명령 후보:

```bash
pnpm --filter admin check-types
pnpm --filter admin build
git diff --check
```

## 단계별 구현 계획 요약

### 1단계: 노출 축소

- `GET /api/members`의 `select("*")` 제거
- `GET /api/members/[id]` 응답 필드 분리
- 조직도 API에서 `birth_date` 기본 제거
- 프론트 타입과 화면 표시 조정

### 2단계: 감사 로그 기반

- `admin_audit_logs` migration 추가
- 공통 `writeAdminAuditLog()` 유틸 추가
- 다운로드 API에 로그 기록 추가
- 민감정보 조회 API에 로그 기록 추가

### 3단계: 권한 세분화

- `rbac.ts`에 위험 행위 권한 추가
- 민감 조회/대량 다운로드/감사 로그 조회에 `requireAdminPermission()` 적용
- P&C 일반 권한 기본값 축소

### 4단계: 운영 신뢰 문서화

- 개발 DB는 샘플/마스킹 데이터만 사용한다는 원칙 정리
- 운영 DB 직접 접속 금지와 break-glass 계정 원칙 정리
- 대표 공유용 요약 문서 작성

## 남은 리스크

- DB에 이미 평문 민감정보가 저장되어 있다면 API 응답 축소만으로는 DB 직접 접근 리스크를 제거할 수 없다.
- service role key를 사용하는 구조에서는 API 계층 실수가 곧 과다 노출로 이어질 수 있다.
- 개발/스테이징 데이터 마스킹이 없으면 개발 과정에서 실제 개인정보가 노출될 수 있다.
- password 필드가 평문 또는 약한 방식으로 저장되어 있다면 별도 인증 보안 개선이 필요하다.
- 재무 금액과 직원 급여성 데이터의 경계가 명확하지 않으면 권한 정책이 느슨해질 수 있다.

## 대표 설명 문구

어드민 앱은 직원 개인정보를 기본적으로 모두 보여주는 구조가 아니라, 화면에 필요한 최소 정보만 보여주는 구조로 바꾼다. 생년월일, 전화번호, 여권번호, 대량 다운로드 같은 민감 행위는 별도 권한과 사유가 있어야 가능하고, 누가 언제 어떤 목적으로 접근했는지 감사 로그가 남는다. 개발 환경은 후속 단계에서 실제 운영 데이터가 아닌 마스킹 데이터만 사용하도록 분리한다.
