# HANDOFF — 다른 맥에서 개발 환경 구성 및 실행

작성일: 2026-07-17 · 대상 브랜치: `feat/attendance-check-in-out`

이 문서는 새 맥에서 meal-acg-v3(모노레포)를 받아 로컬에서 실행하기 위한 최소 절차와,
현재 브랜치에서 진행된 감독관(part-time-supervisor) SSO/RBAC 보안 작업의 맥락을 정리한 것이다.
env 키의 전체 목록은 `README.md`가 기준이며, 이 문서는 새 맥에서 놓치기 쉬운 부분에 집중한다.

---

## 1. 사전 준비물

| 도구 | 버전/비고 |
|------|-----------|
| Node.js | `>=18` (검증 환경: v22.22.1) |
| pnpm | **8.15.6** (`package.json`의 `packageManager`에 고정). `corepack enable` 후 자동 사용 권장 |
| 컨테이너 런타임 | 로컬 Supabase용. **OrbStack**(Docker 호환) 사용 |
| Supabase CLI | 로컬 DB 기동/마이그레이션용 (`brew install supabase/tap/supabase`) |
| Git | GitHub 접근 권한(원격: `github.com:aksel26/meal-acg-v3.git`) |

## 2. 클론 & 설치

```bash
git clone git@github.com:aksel26/meal-acg-v3.git
cd meal-acg-v3
git checkout feat/attendance-check-in-out
corepack enable          # pnpm 8.15.6 활성화
pnpm install
```

## 3. 로컬 Supabase (OrbStack) 기동

> 원격 DB는 대표가 직접 관리한다. **로컬에서만** 작업하며 `supabase db push`·원격 마이그레이션은 절대 금지.

```bash
# OrbStack 실행 중인지 확인 후
supabase start                 # 로컬 스택 기동 (project_id: meal-v3)
supabase db reset              # 모든 마이그레이션 + seed.sql 재적용 (초기 구성 시)
# 이후 새 마이그레이션만 반영할 때:
supabase migration up
supabase status                # API URL / anon key / service_role key 확인
```

로컬 포트: API `54321`, DB `54322`, Studio `54323`(http://127.0.0.1:54323), Inbucket(메일) `54324`.

**이 브랜치는 마이그레이션 `20260716120000_supervisor_security_hardening.sql`이 반드시 적용되어야 한다.**
이 파일이 만드는 것: `supervisor.auth_rate_limits`, `supervisor.sso_handoffs` 테이블과
`consume_auth_rate_limit` / `consume_sso_handoff` RPC. 미적용 시 앱 간 SSO가 동작하지 않는다.
(로그인 rate limit은 RPC 오류 시 fail-open이라 로그인 자체는 막히지 않지만, 보호가 꺼진 상태가 됨.)

## 4. 환경 변수 (`.env.local`)

각 앱의 `.env.local`을 채운다. **전체 키 목록·설명은 `README.md`의 환경 변수 섹션이 기준.**
`NEXT_PUBLIC_SUPABASE_URL`과 anon/service_role 키는 위 `supabase status` 출력값(로컬)을 사용.

새 맥에서 특히 놓치기 쉬운 키:

- `apps/user/.env.local`, `apps/admin/.env.local` — `SUPERVISOR_APP_URL`(감독관 앱 주소, 로컬은 `http://localhost:3002`)
- `apps/part-time-supervisor/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPERVISOR_SESSION_SECRET` — 세션 쿠키 서명용 긴 랜덤 문자열. 운영에서는 필수(개발 `NODE_ENV=development`에선 폴백 존재). 생성: `openssl rand -base64 32`
  - `SUPERVISOR_EDITOR_TEAM_ID` — 편집/접근 권한을 가진 **운영팀 UUID**. 미설정 시 기본값 `a1000000-0000-0000-0000-000000000001`(seed의 'HR 운영팀')이라 로컬 seed에선 설정 불필요. 운영 DB의 UUID가 다르면 반드시 설정.
  - `HR_ENCRYPTION_KEY` — 주민번호 암호화(AES-256-GCM) 키. **Base64로 인코딩한 32바이트.** 생성: `openssl rand -base64 32`. user/admin 앱과 동일 값을 공유해야 복호화가 맞물림.

> 비밀값(운영 키/서비스 롤 키 등)은 문서·저장소에 넣지 말 것. 기존 맥의 `.env.local`을 안전한 채널로 옮기거나 대표에게 발급 요청.

## 5. 실행

```bash
pnpm dev                       # user(:3000) + admin(:3001) 동시
pnpm dev:user                  # user 앱만 (:3000)
pnpm dev:admin                 # admin 앱만 (:3001)
pnpm dev:part-time-supervisor  # 감독관 앱 (:3002)
pnpm dev:project-management    # 프로젝트관리 앱 (:3013)
```

빌드: `pnpm build`(전체) 또는 `pnpm build:user` 등.

## 6. 검증

```bash
pnpm check-types    # 빌드는 TS/ESLint 오류를 무시하므로 수동 확인 필수
pnpm lint
pnpm format
```

- `check-types`에서 **user 앱의 기존 오류**(`components/lunch/WeeklySchedule.tsx`, `components/PopoverCalendar.tsx`,
  자동생성 `lib/supabase/types.ts` 중복 식별자)가 뜬다 — 이 브랜치와 무관한 선재 이슈다.
  supervisor/admin/project-management는 통과해야 정상.
- `pnpm lint`(=`next lint`)가 대화형 설정 프롬프트를 띄우거나 다중 lockfile로 워크스페이스 루트를 잘못 잡는 경우가 있다(환경 이슈). 필요 시 앱 디렉터리에서 개별 실행.

## 7. 이 브랜치의 보안 작업 맥락 (커밋 `9876035`)

감독관 앱 SSO/RBAC 보안 커밋(`d95009c`)에 대한 리뷰 후 수정이 커밋 `9876035`로 반영됨.

**접근 정책**: 감독관 앱 접근 = 편집 권한 = `관리자 OR 운영팀 OR P&C팀`.
- 판정은 `apps/part-time-supervisor/lib/auth.ts`의 공통 헬퍼 `hasSupervisorAccess`로 통일(로컬 로그인·SSO 콜백·requireAuth 공통).
- 운영팀 = `SUPERVISOR_EDITOR_TEAM_ID`, P&C팀 = 팀 이름 `%P&C%`/`%People & Culture%` 매칭(고정 UUID 없음, admin 앱 컨벤션과 동일).
- worker 조회 응답은 `stripWorkerPII`로 주민번호(평문/암호문)를 제거해 내려준다.

**미해결/보류 항목** (재요청 시 처리):
- `supervisor.workers.resident_id_enc`는 write-only — 복호화 경로가 없어 저장한 주민번호를 앱에서 다시 볼 수 없음. 필요 시 관리자 복호화 화면/API 신규 필요.
- `supervisor.auth_rate_limits` 테이블에 TTL/정리(cron) 없음 → 무한 증가. 정리 마이그레이션 필요.
- `apps/part-time-supervisor/components/contract/SignatureStep.tsx`는 미참조 + 항상 400 반환하는 죽은 코드. 삭제/복원 미결정.

**미커밋 상태**: `CLAUDE.md`의 PWA/Gemini 참조 제거(문서 정리)는 이번 보안 커밋과 무관해 워킹 트리에 남겨둠. 새 맥에서 클론하면 이 변경은 없다.
