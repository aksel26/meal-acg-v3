# 직원 인사·급여 정보 암호화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직원(`members`)의 주민등록번호·연봉·계좌를 AES-256-GCM으로 암호화해 격리 테이블에 저장하고, 기존 RBAC·감사 인프라를 재활용해 인가 관리자·본인만 복호화해 열람하게 한다.

**Architecture:** 암호문 전용 테이블 `member_hr_profiles` + 앱 레벨 `hr-crypto.ts`(Node `crypto`). 주민번호·계좌는 기존 `members:sensitive:*`, 연봉은 신규 `members:salary:*`(대표 전용) 권한으로 가드. admin 입력/조회 API와 user 본인 조회 API에서만 복호화. 감사는 기존 `admin_audit_logs` 재활용.

**Tech Stack:** Next.js 15 App Router(route handlers), TypeScript, Supabase(service client), Node `crypto`(aes-256-gcm). 테스트 프레임워크 없음 → 암호화 모듈은 일회용 `.mjs` 라운드트립 스크립트로, 나머지는 `pnpm check-types`/`pnpm lint` + 수동 API 검증.

**제약 (사용자 메모리):**
- 원격 DB 미연결 → 마이그레이션은 `supabase/migrations/`에 **파일만** 생성. `supabase db push` 실행 금지. 타입은 수동으로 `types.ts`에 추가.
- 커밋 메시지에 `Co-Authored-By` 금지. 한국어 커밋(feat/fix/...).

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `supabase/migrations/20260611_member_hr_profiles.sql` | 격리 테이블 + RLS | Create (Task 1) |
| `apps/admin/lib/supabase/types.ts` | `member_hr_profiles` Row/Insert/Update 타입 | Modify (Task 1) |
| `apps/user/lib/supabase/types.ts` | 동일 타입 | Modify (Task 1) |
| `apps/admin/lib/rbac.ts` | `members:salary:*` 권한 정의 | Modify (Task 2) |
| `apps/admin/lib/hr-crypto.ts` | AES-256-GCM encrypt/decrypt | Create (Task 3) |
| `apps/user/lib/hr-crypto.ts` | 동일 | Create (Task 3) |
| `apps/admin/app/api/members/[id]/sensitive/route.ts` | 민감정보 조회(복호화 + 연봉 권한) | Modify (Task 4) |
| `apps/admin/app/api/members/[id]/hr-profile/route.ts` | 민감정보 입력·수정 | Create (Task 5) |
| `apps/user/app/api/users/me/hr-profile/route.ts` | 본인 열람 | Create (Task 6) |
| `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx` | 입력 폼 + 조회값 연결 | Modify (Task 7) |
| `apps/user/...` (본인 정보 화면) | 본인 열람 UI | Create/Modify (Task 8) |

---

## Task 0: 키 생성·환경변수 (코드 아님, 선행)

**이 작업은 사용자(대표)가 수행. 계획 실행자는 안내만 하고 `.env.local` 예시를 남긴다.**

- [ ] **Step 1: 키 생성 안내**

다음 명령으로 32바이트 키를 생성한다(대표가 직접, 안전한 곳에 백업):

```bash
openssl rand -base64 32
```

- [ ] **Step 2: 두 앱 `.env.local`에 등록**

`apps/admin/.env.local`, `apps/user/.env.local` 양쪽에 동일 값 추가:

```
HR_ENCRYPTION_KEY=<위에서 생성한 base64 32바이트>
```

- [ ] **Step 3: 분실 시 영구 복호화 불가임을 문서화**

`docs/superpowers/specs/2026-06-11-hr-data-encryption-design.md` §10을 근거로, 키를 비밀번호 관리자에 백업하고 env 접근 권한은 대표만 갖도록 운영 합의.

---

## Task 1: 격리 테이블 마이그레이션 + 타입

**Files:**
- Create: `supabase/migrations/20260611_member_hr_profiles.sql`
- Modify: `apps/admin/lib/supabase/types.ts` (Tables 블록에 추가)
- Modify: `apps/user/lib/supabase/types.ts` (동일)

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/20260611_member_hr_profiles.sql`:

```sql
-- 직원 민감 인사정보 암호문 격리 테이블
CREATE TABLE IF NOT EXISTS public.member_hr_profiles (
  member_id             uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  resident_id_enc       text,
  account_enc           text,
  salary_enc            text,
  salary_effective_date date,
  salary_note           text,
  updated_by            uuid REFERENCES public.members(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화: 정책을 만들지 않음 = 일반 롤 기본 거부. service_role만 우회 접근.
ALTER TABLE public.member_hr_profiles ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: 마이그레이션 파일이 SQL로 유효한지 육안 확인**

Run: `cat supabase/migrations/20260611_member_hr_profiles.sql`
Expected: 위 내용 그대로. (원격 적용 금지 — 파일만)

- [ ] **Step 3: admin 타입에 테이블 추가**

`apps/admin/lib/supabase/types.ts`의 `Database["public"]["Tables"]` 객체 안(다른 테이블 정의 옆)에 추가:

```ts
      member_hr_profiles: {
        Row: {
          member_id: string
          resident_id_enc: string | null
          account_enc: string | null
          salary_enc: string | null
          salary_effective_date: string | null
          salary_note: string | null
          updated_by: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          member_id: string
          resident_id_enc?: string | null
          account_enc?: string | null
          salary_enc?: string | null
          salary_effective_date?: string | null
          salary_note?: string | null
          updated_by?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          member_id?: string
          resident_id_enc?: string | null
          account_enc?: string | null
          salary_enc?: string | null
          salary_effective_date?: string | null
          salary_note?: string | null
          updated_by?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 4: user 타입에도 동일 블록 추가**

`apps/user/lib/supabase/types.ts`의 `Database["public"]["Tables"]`에 Step 3과 동일한 `member_hr_profiles` 블록 추가.

- [ ] **Step 5: 타입 체크**

Run: `pnpm check-types`
Expected: PASS (member_hr_profiles 참조 전이므로 에러 없음)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260611_member_hr_profiles.sql apps/admin/lib/supabase/types.ts apps/user/lib/supabase/types.ts
git commit -m "feat(hr): 민감 인사정보 암호문 격리 테이블 추가"
```

---

## Task 2: 연봉 권한(`members:salary:*`) 추가

**Files:**
- Modify: `apps/admin/lib/rbac.ts`

- [ ] **Step 1: 권한 상수 추가**

`ADMIN_PERMISSIONS` 배열에서 `"members:sensitive:write",` 다음 줄에 추가:

```ts
  "members:salary:read",
  "members:salary:write",
```

- [ ] **Step 2: 권한 메타데이터 추가**

`ADMIN_PERMISSION_METADATA` 배열에서 `members:sensitive:write` 항목 다음에 추가:

```ts
  { permission: "members:salary:read", label: "직원 연봉 조회", group: "민감정보/다운로드", highRisk: true },
  { permission: "members:salary:write", label: "직원 연봉 수정", group: "민감정보/다운로드", highRisk: true },
```

- [ ] **Step 3: 팀장 기본권한에서 연봉 제외**

`ADMIN_LEADER_PERMISSIONS` 정의를 다음으로 교체:

```ts
const ADMIN_LEADER_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (permission) =>
    permission !== "rbac:manage" &&
    permission !== "members:salary:read" &&
    permission !== "members:salary:write",
);
```

> 일반(`ADMIN_MEMBER_PERMISSIONS`)은 명시 목록이라 연봉 권한이 자동 제외됨. 대표(`REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS`)는 자동 포함.

- [ ] **Step 4: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS. (`AdminPermission` 유니온이 자동 확장됨)

- [ ] **Step 5: Commit**

```bash
git add apps/admin/lib/rbac.ts
git commit -m "feat(hr): 연봉 전용 권한(members:salary) 추가, 대표 전용"
```

---

## Task 3: 암호화 모듈 `hr-crypto.ts`

**Files:**
- Create: `apps/admin/lib/hr-crypto.ts`
- Create: `apps/user/lib/hr-crypto.ts`
- Test(임시): `scripts/verify-hr-crypto.mjs`

- [ ] **Step 1: admin 암호화 모듈 작성**

`apps/admin/lib/hr-crypto.ts`:

```ts
import "server-only";
import crypto from "node:crypto";

const KEY_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.HR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("HR_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("HR_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return `${KEY_VERSION}:${packed.toString("base64")}`;
}

export function decryptField(enc: string | null | undefined): string | null {
  if (enc == null || enc === "") return null;
  const sep = enc.indexOf(":");
  const version = enc.slice(0, sep);
  const payload = enc.slice(sep + 1);
  if (version !== KEY_VERSION || !payload) {
    throw new Error("Unsupported HR ciphertext format");
  }
  const packed = Buffer.from(payload, "base64");
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
```

- [ ] **Step 2: user 모듈에 동일 내용 작성**

`apps/user/lib/hr-crypto.ts` — Step 1과 **동일한 코드** 작성.

- [ ] **Step 3: 라운드트립 검증 스크립트 작성**

`scripts/verify-hr-crypto.mjs` (server-only 의존 없이 동일 알고리즘 복제):

```js
import crypto from "node:crypto";

const KEY_VERSION = "v1", ALGO = "aes-256-gcm", IV = 12, TAG = 16;
const key = Buffer.from(process.env.HR_ENCRYPTION_KEY, "base64");
if (key.length !== 32) throw new Error("key not 32 bytes");

function enc(plain) {
  const iv = crypto.randomBytes(IV);
  const c = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${KEY_VERSION}:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")}`;
}
function dec(s) {
  const p = Buffer.from(s.slice(s.indexOf(":") + 1), "base64");
  const d = crypto.createDecipheriv(ALGO, key, p.subarray(0, IV));
  d.setAuthTag(p.subarray(IV, IV + TAG));
  return Buffer.concat([d.update(p.subarray(IV + TAG)), d.final()]).toString("utf8");
}

const samples = ["9010101234567", "12345000", JSON.stringify({ bank: "국민", number: "123-45-6789" })];
for (const s of samples) {
  const e = enc(s);
  if (dec(e) !== s) throw new Error(`roundtrip failed: ${s}`);
  if (!e.startsWith("v1:")) throw new Error("missing version prefix");
}
// 변조 감지: authTag 손상 시 throw 해야 함
const tampered = "v1:" + Buffer.from("deadbeef".repeat(8)).toString("base64");
let threw = false;
try { dec(tampered); } catch { threw = true; }
if (!threw) throw new Error("tampering not detected");
console.log("OK: roundtrip + tamper-detection passed");
```

- [ ] **Step 4: 검증 실행 (실패하면 안 됨)**

Run: `HR_ENCRYPTION_KEY=$(openssl rand -base64 32) node scripts/verify-hr-crypto.mjs`
Expected: `OK: roundtrip + tamper-detection passed`

- [ ] **Step 5: 검증 스크립트 삭제 (일회용)**

Run: `rm scripts/verify-hr-crypto.mjs`

- [ ] **Step 6: 타입 체크**

Run: `pnpm check-types`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin/lib/hr-crypto.ts apps/user/lib/hr-crypto.ts
git commit -m "feat(hr): AES-256-GCM 암호화 모듈 추가"
```

---

## Task 4: admin 민감정보 조회 라우트 실제 구현

**Files:**
- Modify: `apps/admin/app/api/members/[id]/sensitive/route.ts`

현재는 스텁(연봉 null 고정). `member_hr_profiles`를 읽어 복호화하고, 연봉은 별도 권한일 때만 포함한다.

- [ ] **Step 1: 라우트 전체 교체**

```ts
import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import {
  getAuthErrorStatus,
  requireAdminPermission,
} from "@/lib/auth";
import { hasEffectiveAdminPermission } from "@/lib/rbac-server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptField } from "@/lib/hr-crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:sensitive:read");
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json({ error: "사유를 입력해주세요." }, { status: 400 });
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("member_hr_profiles")
      .select(
        "resident_id_enc, account_enc, salary_enc, salary_effective_date, salary_note",
      )
      .eq("member_id", id)
      .maybeSingle();

    const canSalary = await hasEffectiveAdminPermission(
      session,
      "members:salary:read",
    );

    const residentId = decryptField(profile?.resident_id_enc ?? null);
    const accountRaw = decryptField(profile?.account_enc ?? null);
    const account = accountRaw
      ? (JSON.parse(accountRaw) as { bank: string; number: string })
      : null;

    const salaryPlain = canSalary
      ? decryptField(profile?.salary_enc ?? null)
      : null;
    const annualSalary = salaryPlain != null ? Number(salaryPlain) : null;

    const auditFields = ["resident_id", "account"];
    if (canSalary) auditFields.push("annual_salary");

    await writeAdminAuditLog({
      session,
      request,
      action: "member.sensitive_view",
      targetType: "member",
      targetId: id,
      targetLabel: member.full_name,
      riskLevel: "high",
      reason,
      metadata: { fields: auditFields },
    });

    return NextResponse.json({
      full_name: member.full_name,
      residentId,
      account,
      compensation: {
        annualSalary,
        currency: "KRW",
        effectiveDate: profile?.salary_effective_date ?? null,
        note: profile?.salary_note ?? null,
        registered: profile?.salary_enc != null,
        canView: canSalary,
      },
    });
  } catch (error) {
    console.error("Member sensitive API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/api/members/[id]/sensitive/route.ts
git commit -m "feat(hr): 민감정보 조회 라우트를 암호문 복호화로 구현"
```

---

## Task 5: admin 민감정보 입력·수정 라우트

**Files:**
- Create: `apps/admin/app/api/members/[id]/hr-profile/route.ts`

- [ ] **Step 1: 라우트 작성 (필드별 권한 + 암호화 + 감사)**

```ts
import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import {
  AuthError,
  getAuthErrorStatus,
  requireAdminPermission,
} from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptField } from "@/lib/hr-crypto";

type Body = {
  residentId?: string | null;
  account?: { bank: string; number: string } | null;
  salary?: number | string | null;
  salaryEffectiveDate?: string | null;
  salaryNote?: string | null;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const { id } = await params;

    const touchesSensitive =
      "residentId" in body || "account" in body;
    const touchesSalary =
      "salary" in body ||
      "salaryEffectiveDate" in body ||
      "salaryNote" in body;

    if (!touchesSensitive && !touchesSalary) {
      return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 });
    }

    // 필드별 권한 가드 (둘 다 건드리면 둘 다 필요)
    let session = touchesSensitive
      ? await requireAdminPermission("members:sensitive:write")
      : await requireAdminPermission("members:salary:write");
    if (touchesSensitive && touchesSalary) {
      session = await requireAdminPermission("members:salary:write");
    }

    const supabase = createServiceClient();

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", id)
      .single();
    if (memberError || !member) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    const update: Record<string, string | null> = { member_id: id, updated_by: session.userId };
    const changed: string[] = [];

    if ("residentId" in body) {
      const v = body.residentId?.trim();
      update.resident_id_enc = v ? encryptField(v) : null;
      changed.push("resident_id");
    }
    if ("account" in body) {
      const a = body.account;
      update.account_enc = a ? encryptField(JSON.stringify({ bank: a.bank, number: a.number })) : null;
      changed.push("account");
    }
    if ("salary" in body) {
      const s = body.salary;
      update.salary_enc = s != null && `${s}` !== "" ? encryptField(`${s}`) : null;
      changed.push("annual_salary");
    }
    if ("salaryEffectiveDate" in body) {
      update.salary_effective_date = body.salaryEffectiveDate || null;
      changed.push("salary_effective_date");
    }
    if ("salaryNote" in body) {
      update.salary_note = body.salaryNote || null;
      changed.push("salary_note");
    }

    const { error: upsertError } = await supabase
      .from("member_hr_profiles")
      .upsert(update, { onConflict: "member_id" });
    if (upsertError) {
      console.error("hr-profile upsert error:", upsertError);
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    await writeAdminAuditLog({
      session,
      request,
      action: "member.hr_update",
      targetType: "member",
      targetId: id,
      targetLabel: member.full_name,
      riskLevel: "high",
      metadata: { fields: changed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("hr-profile PUT error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/api/members/[id]/hr-profile/route.ts
git commit -m "feat(hr): 민감정보 입력·수정 라우트 추가 (필드별 권한)"
```

---

## Task 6: user 본인 열람 라우트

**Files:**
- Create: `apps/user/app/api/users/me/hr-profile/route.ts`

user 앱엔 `writeAdminAuditLog`가 없으므로 `admin_audit_logs`에 직접 insert.

- [ ] **Step 1: 라우트 작성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import { decryptField } from "@/lib/hr-crypto";

function maskResident(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "******";
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

function maskAccount(account: { bank: string; number: string } | null) {
  if (!account) return null;
  const n = account.number.replace(/\s/g, "");
  const tail = n.slice(-4);
  return { bank: account.bank, number: `****-**-**${tail}` };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
  }

  const reveal = request.nextUrl.searchParams.get("reveal") === "true";

  const { data: profile } = await supabase
    .from("member_hr_profiles")
    .select("resident_id_enc, account_enc, salary_enc, salary_effective_date, salary_note")
    .eq("member_id", user.id)
    .maybeSingle();

  const residentPlain = decryptField(profile?.resident_id_enc ?? null);
  const accountRaw = decryptField(profile?.account_enc ?? null);
  const accountPlain = accountRaw
    ? (JSON.parse(accountRaw) as { bank: string; number: string })
    : null;
  const salaryPlain = decryptField(profile?.salary_enc ?? null);

  if (reveal) {
    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      actor_name: user.fullName,
      action: "member.self_hr_view",
      target_type: "member",
      target_id: user.id,
      target_label: user.fullName,
      risk_level: "low",
      metadata: { fields: ["resident_id", "account", "annual_salary"] },
      request_path: request.nextUrl.pathname,
    });
  }

  return NextResponse.json({
    registered: profile != null,
    residentId: reveal ? residentPlain : maskResident(residentPlain),
    account: reveal ? accountPlain : maskAccount(accountPlain),
    annualSalary: reveal ? (salaryPlain != null ? Number(salaryPlain) : null) : null,
    salaryMasked: salaryPlain != null,
    salaryEffectiveDate: profile?.salary_effective_date ?? null,
    salaryNote: profile?.salary_note ?? null,
  });
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/user/app/api/users/me/hr-profile/route.ts
git commit -m "feat(hr): 본인 인사정보 열람 라우트 추가 (user)"
```

---

## Task 7: admin 멤버 상세 페이지 — 입력 폼 + 조회값 연결

**Files:**
- Modify: `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx`

> 이 페이지에는 이미 민감정보 조회 UI(`sensitiveData.compensation.annualSalary` 등, 열람 사유 입력)가 있다. 실행 전 **반드시 이 파일을 읽어** 기존 `SensitiveMember` 타입·`sensitiveMutation`·표시 컴포넌트(`Field`)를 확인하고 그 패턴에 맞춘다.

- [ ] **Step 1: 기존 구조 파악**

Run: `sed -n '70,260p' apps/admin/app/(dashboard)/organization/members/[id]/page.tsx`
확인 항목: `SensitiveMember` 타입 모양, `sensitiveMutation`의 응답 사용, `Field` 컴포넌트 사용법, `canRequestSensitive` 게이팅.

- [ ] **Step 2: `SensitiveMember` 타입을 Task 4 응답에 맞춰 확장**

기존 타입에 `residentId`, `account`, `compensation.canView`를 추가하고, 조회 결과 표시부에 주민번호·계좌 필드를 `Field`로 추가한다(연봉 표시는 `compensation.canView`가 false면 "열람 권한 없음"으로). 기존 연봉 표시 로직을 응답의 실제 값(`annualSalary`)에 연결.

- [ ] **Step 3: 입력 폼 추가**

`members:sensitive:write`/`members:salary:write` 보유 시 보이는 "민감정보 수정" 다이얼로그를 추가한다. 폼 필드: 주민등록번호, 은행/계좌번호, (연봉 권한 보유 시) 연봉/적용일/비고. 저장 시 `PUT /api/members/${id}/hr-profile`에 변경 필드만 전송.

권한 노출은 기존 `overview.permissions`(Task 4 `/overview` 응답)에 `salary` 추가가 필요하면 `apps/admin/app/api/members/[id]/overview/route.ts`의 `permissions` 객체에 `salary: await hasEffectiveAdminPermission(session, "members:salary:read")`를 더한다.

저장 mutation 예시(기존 `sensitiveMutation` 패턴 따름):

```ts
const hrUpdateMutation = useMutation({
  mutationFn: async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/members/${id}/hr-profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "저장 실패");
    return res.json();
  },
  onSuccess: () => {
    // 조회 캐시 무효화 또는 sensitiveData 재요청
  },
});
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 5: 수동 검증 (dev 서버)**

Run: `pnpm dev:admin` 후 대표 계정으로 멤버 상세 → 민감정보 입력 → 저장 → 사유 입력 후 조회. 비대표(연봉 권한 없는) 계정은 연봉이 "열람 권한 없음"으로 보이는지 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/(dashboard)/organization/members/[id]/page.tsx apps/admin/app/api/members/[id]/overview/route.ts
git commit -m "feat(hr): 멤버 상세에 민감정보 입력 폼·조회 연결"
```

---

## Task 8: user 본인 정보 열람 화면

**Files:**
- Modify/Create: user 앱 "내 정보"/설정 화면 (실행 전 `apps/user/app` 구조 확인해 적절한 위치 선택; 없으면 `apps/user/app/(main)/my-info/page.tsx` 신설)

- [ ] **Step 1: user 앱 마이페이지 경로 확인**

Run: `find apps/user/app -type d | grep -viE 'api|\\.next' | head -40`
적절한 "내 정보" 경로를 고르거나 신설한다.

- [ ] **Step 2: 본인 인사정보 카드 추가**

`GET /api/users/me/hr-profile`(마스킹) 호출 → 주민번호/계좌/연봉을 마스킹 표시. "전체 보기" 버튼 클릭 시 `?reveal=true` 재호출해 평문 표시. `registered=false`면 "등록된 정보 없음" 안내.

조회 훅 예시:

```ts
function useMyHrProfile(reveal: boolean) {
  return useQuery({
    queryKey: ["my-hr-profile", reveal],
    queryFn: async () => {
      const res = await fetch(`/api/users/me/hr-profile?reveal=${reveal}`);
      if (!res.ok) throw new Error("불러오기 실패");
      return res.json();
    },
  });
}
```

- [ ] **Step 3: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 4: 수동 검증**

Run: `pnpm dev:user` 후 로그인 → 내 정보 → 마스킹 표시 확인 → "전체 보기" → 평문 확인. 다른 사용자 정보는 접근 불가(경로에 타인 id 없음)임을 확인.

- [ ] **Step 5: Commit**

```bash
git add apps/user/...
git commit -m "feat(hr): 본인 인사정보 열람 화면 추가 (user)"
```

---

## Task 9: 최종 검증 + 보안 점검

- [ ] **Step 1: 전체 타입·린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS (both apps)

- [ ] **Step 2: DB 암호문 확인 (dev/로컬 DB 사용 시)**

`member_hr_profiles`를 직접 SELECT 했을 때 `resident_id_enc`/`salary_enc`가 `v1:...` 형태(평문 아님)인지 확인.

- [ ] **Step 3: 권한 격리 확인**

- 연봉 권한 없는 admin: `sensitive` 응답의 `compensation.canView === false`, 연봉 null.
- `members:sensitive:write` 없는 admin이 `hr-profile` PUT → 403.
- user가 타인 정보 접근 경로 없음(`/users/me/`만 존재) 확인.

- [ ] **Step 4: 키 부재 시 동작 확인**

`HR_ENCRYPTION_KEY` 미설정으로 dev 기동 후 입력 시도 → 명확한 500/에러(평문 저장 안 됨) 확인.

- [ ] **Step 5: 최종 커밋 (잔여 변경 있으면)**

```bash
git add -A && git commit -m "chore(hr): 최종 검증 반영"
```

---

## Self-Review 메모

- **스펙 커버리지**: §4 테이블→T1, §5 암호화→T3, §6 권한→T2, §7 API(admin 조회/입력, user 본인)→T4·T5·T6, §8 마스킹→T6·T8, §9 감사→T4·T5·T6, §10 키운영→T0, UI→T7·T8. 누락 없음.
- **연봉 권한 분리**: T2(권한 정의)·T4(조회 시 canView)·T5(입력 시 salary:write)·T7(UI 게이팅)에서 일관 적용.
- **암호문 포맷**: `v1:` prefix + base64(IV‖authTag‖ciphertext) — T3 정의, T4·T5·T6에서 `encryptField`/`decryptField`로만 사용. 시그니처 일치.
- **원격 DB 미연결**: T1은 파일만 생성, push 없음. 타입 수동 추가. 로컬 검증은 dev 기준.
