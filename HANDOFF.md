# HANDOFF — 다른 맥에서 개발 환경 구성 및 실행

작성일: 2026-07-17 · 대상 브랜치: `feat/attendance-check-in-out`

이 문서는 새 맥에서 meal-acg-v3(모노레포)를 받아 로컬에서 실행하기 위한 최소 절차와,
현재 브랜치에서 진행된 감독관(part-time-supervisor) SSO/RBAC 보안 작업의 맥락을 정리한 것이다.
env 키의 전체 목록은 `README.md`가 기준이며, 이 문서는 새 맥에서 놓치기 쉬운 부분에 집중한다.
2026-07-30 기준 User 앱 챗봇 구현 인계 내용은 아래 8절에 추가했다.

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

---

## 8. User 앱 챗봇 구현 handoff (2026-07-30)

### 8.1 현재 상태

- 이 절은 **구현 전 handoff**다. User 앱 챗봇 UI와 `/api/chat`은 아직 없다.
- 현재 설계 원본은 `DESIGN.md`의 `User chatbot MVP` 절이다.
- 브랜치는 `feat/attendance-check-in-out`이다.
- `DESIGN.md`, `apps/user/app/(content)/acg-life/data.ts`와 Admin 비용처리 관련 파일에 다른 미커밋 작업이 있다. 챗봇 작업에서 되돌리거나 함께 스테이징하지 않는다.
- 로컬 Ollama 프로토타입은 실행 중이며 아래 모델/API 상태만 재검증했다. User 앱 연동과 브라우저 검증은 아직 하지 않았다.

### 8.2 목표와 첫 출시 범위

로그인한 직원이 User 앱 어디서든 다음 질문을 할 수 있는 읽기 전용 챗봇을 추가한다.

1. `내 휴가 얼마나 남았어?`
2. `원래 법정 연차는 며칠이야?`
3. `반차/반반차 규정 알려줘`
4. 현재 게시된 ACG 사규에서 근거를 찾을 수 있는 간단한 자유 질문

답변은 항상 짧은 본문, 기준일, 출처 칩을 함께 보여준다.

첫 출시에서 제외한다.

- 휴가 신청·수정·취소·승인 같은 쓰기 작업
- 모델이 개인 휴가 수치를 계산하는 동작
- 장기 대화 저장, 대화 검색, 관리자 열람
- PDF/XLSX 업로드, OCR, 자동 문서 수집
- 벡터 DB와 임베딩
- 식대·복지포인트 등 다른 업무 도메인
- 인터넷 검색을 통한 실시간 법률 자문

### 8.3 최소 아키텍처

```text
User Chat UI
  └─ POST /api/chat { message }
       ├─ getSessionUser()
       ├─ 질문 분류
       │    ├─ 개인 휴가
       │    │    └─ leave_balances 조회 → 서버 계산 → 템플릿 답변
       │    ├─ 사규/법정 기준
       │    │    └─ 게시된 규정 문맥 → 로컬 Ollama → 출처 검증
       │    └─ 지원 범위 밖
       │         └─ 짧게 거절
       └─ { kind, answer, asOf, sources, requestId }
```

Supabase는 직원 인증과 업무 데이터 저장소다. 모델 호스팅 역할은 하지 않는다. Next.js 서버가 로컬 Ollama HTTP API를 호출한다.

### 8.4 실제 데이터 흐름

#### 개인 휴가

```text
POST /api/chat
  → getSessionUser()
  → sessionUser.id
  → leave_balances
     select: year, type, granted, used, adjusted
     filter: member_id = sessionUser.id, year = 현재 연도
  → type이 annual 또는 monthly인 행 집계
  → total = granted + adjusted
  → remaining = total - used
  → 서버 템플릿으로 답변
```

기존 근거:

- 인증: `apps/user/lib/auth.ts`의 `getSessionUser()`
- 조회 API: `apps/user/app/api/leave-balances/route.ts`
- 클라이언트 훅: `apps/user/hooks/use-leave-balances.ts`
- 현재 계산 중복:
  - `apps/user/components/attendance/AttendanceDesktopView.tsx`
  - `apps/user/components/dayoffs/DayoffsMonthlyOverview.tsx`

챗봇 구현 전에 조회와 집계를 서버 helper 하나로 옮기고 `/api/leave-balances`와 `/api/chat`이 같이 사용한다. 클라이언트가 보낸 `memberId`나 잔액은 사용하지 않는다.

#### 사규와 법정 기준

현재 작은 문서 원천은 `apps/user/app/(content)/acg-life/data.ts`의 `REGULATION_CATEGORIES`다.

1. ACG Life 화면과 서버가 같이 import할 수 있는 공용 모듈로 이동한다.
2. 초기에는 게시된 전체 문맥을 모델에 전달한다.
3. 모델에는 질문, 공개된 사규 문장, 내부 source ID만 전달한다.
4. 모델이 반환한 source ID는 서버 allowlist와 대조한다.
5. 화면에 표시할 제목, URL, 개정일은 모델 출력이 아니라 서버 원천 데이터에서 다시 매핑한다.
6. 법정 기준은 `ACG 사규`와 구분해 `근로기준법 제60조`, [국가법령정보센터 공식 URL](https://law.go.kr/LSW/LsiJoLinkP.do?languageType=KO&lsNm=%EA%B7%BC%EB%A1%9C%EA%B8%B0%EC%A4%80%EB%B2%95&paras=1), 최종 확인일을 표시한다. 제60조 근거는 2026-07-30에 다시 확인했다.

문서가 커져 프롬프트 크기나 정확도가 실제로 문제가 된 뒤에만 chunk 검색과 embeddings를 검토한다.

### 8.5 API 계약

요청:

```json
{
  "message": "내 휴가 얼마나 남았어?"
}
```

정상 응답:

```json
{
  "kind": "leave_balance",
  "answer": "2026년 휴가는 총 15일이고 4.5일 사용해 10.5일 남았습니다.",
  "asOf": "2026-07-30",
  "sources": [
    {
      "id": "personal-leave-2026",
      "type": "personal",
      "label": "2026년 내 휴가 데이터",
      "href": "/attendance-stats",
      "asOf": "2026-07-30"
    }
  ],
  "requestId": "server-generated-id"
}
```

오류 응답은 기존 API 스타일대로 `{ "error": "사용자 메시지" }`를 사용한다.

| HTTP | 조건 |
|---:|---|
| 400 | 빈 질문, 허용 길이 초과, 잘못된 JSON |
| 401 | 세션 없음 |
| 429 | 사용자별 요청 제한 초과 |
| 502 | Ollama 연결 또는 응답 검증 실패 |
| 504 | 모델 응답 시간 초과 |

### 8.6 UI 구성

- 삽입 위치: `apps/user/app/(content)/layout.tsx`
- 데스크톱: 우측 하단 런처 → 기존 `@repo/ui/src/sheet` 사용, 폭 약 400px
- 모바일: `BottomNavigation` 위 런처 → 기존 `@repo/ui/src/drawer` 사용
- 첫 화면: 안내 문구와 빠른 질문 3개
- 대화 영역: 사용자/도우미 버블, 로딩, 재시도, 출처 칩
- 입력: Enter 전송, Shift+Enter 줄바꿈, 전송 중 중복 제출 방지
- 접근성: 런처/닫기 버튼 이름, `SheetTitle`/`DrawerTitle`, 포커스 복귀, 키보드 탐색
- 대화는 컴포넌트 메모리에만 두고 새로고침 시 초기화한다.

새 UI 패키지나 전역 상태 저장소는 추가하지 않는다. 데스크톱/모바일 패널의 대화 본문은 한 컴포넌트를 공유한다.

예상 최소 파일:

```text
apps/user/app/(content)/layout.tsx
apps/user/app/api/chat/route.ts
apps/user/app/(content)/acg-life/data.ts       # 공용 모듈로 이동 후 import만 유지
apps/user/components/chat/ChatLauncher.tsx
apps/user/components/chat/ChatPanel.tsx
apps/user/lib/chat/leave-balance.ts
apps/user/lib/chat/regulations.ts
apps/user/lib/chat/ollama.ts
apps/user/lib/chat/types.ts
```

### 8.7 로컬 Ollama 기준

환경 변수 이름:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b-instruct-2507-q4_K_M
OLLAMA_TIMEOUT_MS=60000
```

비밀값은 아니지만 서버 전용 변수로 두며 `NEXT_PUBLIC_` 접두사를 사용하지 않는다.

2026-07-30 재확인 결과:

| 항목 | 결과 |
|---|---|
| 컨테이너 | `meal-acg-ollama-prototype`, healthy |
| 포트 | `127.0.0.1:11434`에만 바인딩 |
| 모델 | `qwen3:4b-instruct-2507-q4_K_M` |
| digest | `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0` |
| 모델 파일 크기 | 약 2.5GB |
| 제한 | 메모리 5GiB, CPU 6개 |
| 현재 smoke test | 총 30.9초, 모델 load 23.1초, 약 5.5 token/s |

중요: 단순 프롬프트 smoke test에서 근거에 없던 `12시간`, `제12조`를 모델이 추가했다. 따라서 **모델 자연어 응답과 출처를 그대로 신뢰하면 안 된다.**

- 개인 휴가 답변은 모델을 통하지 않는다.
- 빠른 사규 질문은 가능한 경우 게시 문구를 서버 템플릿으로 바로 응답한다.
- 자유 사규 질문만 로컬 모델을 사용한다.
- 모델 source ID는 서버가 검증하고, 허용되지 않은 출처나 검증할 수 없는 답은 실패 처리한다.
- 모델 장애 시 근거 화면 링크와 HR 문의 안내를 반환하며 추측하지 않는다.

### 8.8 보안 경계

- `/api/chat`은 요청마다 `getSessionUser()`를 실행한다.
- 개인 데이터는 세션 사용자 ID로만 조회한다.
- 이름, member ID, 휴가 사유, 날짜별 휴가 이력은 Ollama로 보내지 않는다.
- 개인 휴가 경로에서 모델로 보낼 데이터는 없다.
- 질문 길이와 한 요청의 메시지 수를 제한한다.
- 서버 타임아웃과 응답 크기 제한을 둔다.
- 운영 로그에는 원문 질문/답변 대신 `requestId`, 처리 종류, 지연 시간, 상태 코드, 오류 코드만 남긴다.
- Ollama 포트는 외부 인터페이스에 공개하지 않는다.
- 법률/사규 답변은 정보 제공이며 개인별 근태율, 휴직, 퇴사 조건 판단은 HR 확인으로 종료한다.

### 8.9 구현 순서

1. 사규 데이터를 공용 모듈로 이동하고 ACG Life 화면의 표시가 동일한지 확인한다.
2. 휴가 조회/집계 server helper를 만들고 기존 `/api/leave-balances`가 재사용하도록 정리한다.
3. 개인 휴가·사규·지원 범위 밖 분기를 가진 `/api/chat`을 추가한다.
4. 최소 Ollama client를 native `fetch`로 추가하고 타임아웃/응답 검증을 구현한다.
5. 공통 대화 본문과 데스크톱 Sheet/모바일 Drawer 런처를 추가한다.
6. 입력 제한, 오류 상태, 비식별 운영 로그를 추가한다.
7. 아래 검증을 통과한 뒤 브라우저에서 모바일 하단 내비게이션 겹침을 확인한다.

### 8.10 검증 기준

필수 시나리오:

- A 사용자의 질문이 A 사용자의 현재 연도 잔액만 반환한다.
- 요청 body/query에 다른 `memberId`를 넣어도 결과가 바뀌지 않는다.
- 총량, 사용량, 조정량, 잔여량이 기존 휴가 화면과 일치한다.
- 법정 기준 질문을 개인 실제 잔액으로 표현하지 않는다.
- 사규 답변마다 서버가 매핑한 제목과 개정일이 있다.
- 근거가 없는 숫자, 조항, 개인 판단을 모델이 반환하면 사용자에게 노출하지 않는다.
- Ollama 중단/타임아웃 시 추측 없이 복구 가능한 오류 UI를 보여준다.
- 로그에 이름, ID, 질문 원문, 휴가 상세가 남지 않는다.
- 모바일 런처와 Drawer가 `BottomNavigation`을 가리지 않는다.
- 키보드만으로 열기, 질문 전송, 닫기, 원래 버튼으로 포커스 복귀가 가능하다.

저장소 품질 게이트:

```bash
pnpm --filter user check-types
pnpm --filter user lint
pnpm --filter user build
git diff --check
```

현재 User 앱에는 전용 단위/E2E 테스트 프레임워크가 없다. 새 프레임워크를 추가하지 말고, 계산/응답 검증은 의존성 없는 작은 함수로 분리해 최소 실행 검증을 남긴다. 브라우저 검증과 실제 로그인 세션 API 확인은 정적 빌드와 별도 증거로 기록한다.

### 8.11 완료 조건과 남은 결정

완료 조건:

- 세 가지 빠른 질문과 근거가 있는 자유 사규 질문이 동작한다.
- 개인 수치는 항상 서버 계산값이고 모델 출력이 아니다.
- 모든 답변이 기준일과 출처를 가진다.
- 지원 범위 밖 질문, 모델 장애, 근거 부족이 안전하게 거절된다.
- 모바일/데스크톱 UI와 인증·개인정보 경계가 검증된다.

구현 전에 확정할 결정:

1. 첫 출시 자유 질문을 허용할지, 빠른 질문 세 종류로만 닫을지
2. 운영 환경에서 Ollama를 Next.js 서버와 같은 호스트에 둘지 별도 내부 호스트에 둘지
3. 법정 기준 콘텐츠의 검수 책임자와 갱신 주기
