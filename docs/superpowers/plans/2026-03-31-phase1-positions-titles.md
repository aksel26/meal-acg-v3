# Phase 1: 직급/직책 테이블 + 마이그레이션 + 관리 UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `member_role` ENUM을 `positions`(직급) + `titles`(직책) 테이블로 분리하고, admin 앱에 관리 UI를 추가한다.

**Architecture:** Supabase public 스키마에 `positions`, `titles` 테이블을 생성하고, `members` 테이블에 `position_id`, `title_id` FK를 추가한다. 기존 `member_role` 데이터를 마이그레이션한 후, admin 앱 코드에서 `member_role` 참조를 새 FK로 전환한다. admin 사이드바에 "직급/직책 관리" 메뉴를 추가한다.

**Tech Stack:** Supabase (Postgres), Next.js 15 App Router, React 19, TanStack React Query, @repo/ui (Radix)

**참고:** 이 프로젝트에는 테스트 프레임워크가 없음 (CLAUDE.md 참조). 검증은 `pnpm check-types`와 브라우저 확인으로 수행.

---

### Task 1: DB 마이그레이션 — positions, titles 테이블 생성

**Files:**
- Create: `supabase/migrations/20260331_positions_titles.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- =============================================================
-- 직급(positions) / 직책(titles) 테이블 생성
-- 기존 member_role ENUM을 대체하기 위한 정규화
-- =============================================================

-- 1. positions (직급)
CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  annual_leave_days integer NOT NULL DEFAULT 0,
  leave_accrual_rule text NOT NULL DEFAULT 'fixed'
    CHECK (leave_accrual_rule IN ('none', 'fixed', '+1_per_3yr')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE positions IS '직급 테이블 (인턴, 사원, 선임, 책임, 수석, 대표)';
COMMENT ON COLUMN positions.annual_leave_days IS '기본 연차일수';
COMMENT ON COLUMN positions.leave_accrual_rule IS 'none=부여없음, fixed=고정, +1_per_3yr=입사3년마다+1';

-- 초기 데이터
INSERT INTO positions (name, sort_order, annual_leave_days, leave_accrual_rule) VALUES
  ('인턴', 1, 0, 'none'),
  ('사원', 2, 15, 'fixed'),
  ('선임', 3, 16, '+1_per_3yr'),
  ('책임', 4, 16, '+1_per_3yr'),
  ('수석', 5, 16, '+1_per_3yr'),
  ('대표', 6, 16, '+1_per_3yr');

-- 2. titles (직책)
CREATE TABLE titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE titles IS '직책 테이블 (파트장, 팀장, 본부장)';

-- 초기 데이터
INSERT INTO titles (name, sort_order) VALUES
  ('파트장', 1),
  ('팀장', 2),
  ('본부장', 3);

-- 3. members 테이블에 FK 추가
ALTER TABLE members
  ADD COLUMN position_id uuid REFERENCES positions(id),
  ADD COLUMN title_id uuid REFERENCES titles(id);

CREATE INDEX idx_members_position_id ON members(position_id);
CREATE INDEX idx_members_title_id ON members(title_id);

-- 4. 기존 member_role 데이터 마이그레이션
-- 인턴 → position: 인턴
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '인턴')
  WHERE member_role = '인턴';

-- 팀원 → position: 사원 (기본값)
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '사원')
  WHERE member_role = '팀원';

-- 팀장 → position: 사원 (기본값, 관리자가 추후 수정), title: 팀장
UPDATE members SET
  position_id = (SELECT id FROM positions WHERE name = '사원'),
  title_id = (SELECT id FROM titles WHERE name = '팀장')
  WHERE member_role = '팀장';

-- 본부장 → position: 사원 (기본값, 관리자가 추후 수정), title: 본부장
UPDATE members SET
  position_id = (SELECT id FROM positions WHERE name = '사원'),
  title_id = (SELECT id FROM titles WHERE name = '본부장')
  WHERE member_role = '본부장';

-- position_id가 NULL인 나머지 → 사원으로 기본 설정
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '사원')
  WHERE position_id IS NULL;

-- position_id를 NOT NULL로 변경
ALTER TABLE members ALTER COLUMN position_id SET NOT NULL;

-- 5. updated_at 트리거
CREATE TRIGGER set_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_titles_updated_at BEFORE UPDATE ON titles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. member_current_status VIEW 업데이트 (position, title 조인 추가)
CREATE OR REPLACE VIEW member_current_status AS
SELECT
  m.id,
  m.full_name,
  m.login_id,
  m.role,
  m.member_role,
  m.email,
  m.hire_date,
  m.intern_months,
  m.organization_id,
  m.division_id,
  m.team_id,
  m.position_id,
  m.title_id,
  t.name AS team_name,
  d.name AS division_name,
  p.name AS position_name,
  tt.name AS title_name,
  ms.status,
  ms.effective_date,
  ms.reason
FROM members m
LEFT JOIN teams t ON m.team_id = t.id
LEFT JOIN divisions d ON m.division_id = d.id
LEFT JOIN positions p ON m.position_id = p.id
LEFT JOIN titles tt ON m.title_id = tt.id
LEFT JOIN LATERAL (
  SELECT status, effective_date, reason
  FROM member_statuses
  WHERE member_id = m.id
  ORDER BY effective_date DESC, created_at DESC
  LIMIT 1
) ms ON true;
```

- [ ] **Step 2: 로컬 DB 적용 확인**

Run: `supabase db reset 2>&1 | tail -10`
Expected: `Finished supabase db reset`

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260331_positions_titles.sql
git commit -m "feat(db): positions/titles 테이블 생성 및 member_role 데이터 마이그레이션"
```

---

### Task 2: Supabase 타입 재생성 + seed.sql 업데이트

**Files:**
- Modify: `apps/admin/lib/supabase/types.ts`
- Modify: `apps/user/lib/supabase/types.ts`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: seed.sql에 position_id, title_id 추가**

`supabase/seed.sql`의 members INSERT를 수정하여 `position_id`, `title_id`를 포함한다. 직접 UUID를 사용하지 않고 서브쿼리로 참조:

seed.sql의 멤버 INSERT 문 앞에 positions/titles ID를 변수로 활용할 수 없으므로, 마이그레이션에서 이미 초기 데이터를 삽입하고 seed에서는 members의 position_id를 서브쿼리로 설정한다:

```sql
-- seed.sql 멤버 INSERT 직후에 추가:

-- 직급/직책 매핑 (시드 데이터용)
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '책임'), title_id = (SELECT id FROM titles WHERE name = '팀장')
  WHERE id = 'b1000000-0000-0000-0000-000000000001'; -- 김관리 (admin)
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '사원')
  WHERE id = 'b1000000-0000-0000-0000-000000000002'; -- 이철수
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '선임')
  WHERE id = 'b1000000-0000-0000-0000-000000000003'; -- 박영희
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '사원')
  WHERE id = 'b1000000-0000-0000-0000-000000000004'; -- 최민수
UPDATE members SET position_id = (SELECT id FROM positions WHERE name = '인턴')
  WHERE id = 'b1000000-0000-0000-0000-000000000005'; -- 정수진
```

- [ ] **Step 2: supabase db reset으로 확인**

Run: `supabase db reset 2>&1 | tail -10`
Expected: `Finished supabase db reset`

- [ ] **Step 3: 타입 파일 수동 업데이트**

`apps/admin/lib/supabase/types.ts`에 `positions`와 `titles` 테이블 타입을 추가한다. 기존 `Database.public.Tables` 안에:

```typescript
// positions 테이블
positions: {
  Row: {
    id: string
    name: string
    sort_order: number
    annual_leave_days: number
    leave_accrual_rule: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    sort_order?: number
    annual_leave_days?: number
    leave_accrual_rule?: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    name?: string
    sort_order?: number
    annual_leave_days?: number
    leave_accrual_rule?: string
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}

// titles 테이블
titles: {
  Row: {
    id: string
    name: string
    sort_order: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    sort_order?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    name?: string
    sort_order?: number
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}
```

`members` Row/Insert/Update 타입에도 `position_id`, `title_id` 필드를 추가한다.

`member_current_status` VIEW 타입에도 `position_id`, `title_id`, `position_name`, `title_name` 필드를 추가한다.

동일하게 `apps/user/lib/supabase/types.ts`에도 반영한다.

- [ ] **Step 4: 커밋**

```bash
git add supabase/seed.sql apps/admin/lib/supabase/types.ts apps/user/lib/supabase/types.ts
git commit -m "chore(db): positions/titles 타입 추가 및 시드 데이터 업데이트"
```

---

### Task 3: 직급/직책 CRUD API 라우트

**Files:**
- Create: `apps/admin/app/api/positions/route.ts`
- Create: `apps/admin/app/api/positions/[id]/route.ts`
- Create: `apps/admin/app/api/titles/route.ts`
- Create: `apps/admin/app/api/titles/[id]/route.ts`

- [ ] **Step 1: positions API 작성**

`apps/admin/app/api/positions/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("sort_order");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/positions error:", error);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, sort_order, annual_leave_days, leave_accrual_rule } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("positions")
      .insert({ name, sort_order: sort_order ?? 0, annual_leave_days: annual_leave_days ?? 0, leave_accrual_rule: leave_accrual_rule ?? "fixed" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 직급입니다." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/positions error:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
```

`apps/admin/app/api/positions/[id]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("positions")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Position not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 직급입니다." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/positions error:", error);
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const supabase = createServiceClient();

    // 해당 직급을 사용 중인 멤버가 있는지 확인
    const { count } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("position_id", id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `${count}명이 이 직급을 사용 중입니다. 먼저 변경해주세요.` },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/positions error:", error);
    return NextResponse.json({ error: "Failed to delete position" }, { status: 500 });
  }
}
```

- [ ] **Step 2: titles API 작성**

`apps/admin/app/api/titles/route.ts` — positions와 동일 패턴 (GET + POST). `annual_leave_days`, `leave_accrual_rule` 필드 없이 `name`, `sort_order`만.

`apps/admin/app/api/titles/[id]/route.ts` — positions와 동일 패턴 (PUT + DELETE). DELETE 시 해당 직책을 사용 중인 멤버 확인 (`title_id`).

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types 2>&1 | tail -10`
Expected: admin, part-time-supervisor 통과 (user는 기존 에러 무시)

- [ ] **Step 4: 커밋**

```bash
git add apps/admin/app/api/positions/ apps/admin/app/api/titles/
git commit -m "feat(admin): 직급/직책 CRUD API 라우트 추가"
```

---

### Task 4: Query Keys + React Query Hooks

**Files:**
- Modify: `apps/admin/lib/query-keys.ts`
- Create: `apps/admin/hooks/usePositions.ts`
- Create: `apps/admin/hooks/useTitles.ts`

- [ ] **Step 1: query-keys.ts에 positions, titles 추가**

```typescript
// apps/admin/lib/query-keys.ts에 추가:
positions: {
  all: ["positions"] as const,
},
titles: {
  all: ["titles"] as const,
},
```

- [ ] **Step 2: usePositions 훅 작성**

`apps/admin/hooks/usePositions.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface Position {
  id: string;
  name: string;
  sort_order: number;
  annual_leave_days: number;
  leave_accrual_rule: string;
  created_at: string;
  updated_at: string;
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: queryKeys.positions.all,
    queryFn: async () => {
      const res = await fetch("/api/positions");
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Position>) => {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      toast.success("직급이 추가되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Position> & { id: string }) => {
      const res = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberStatuses.all });
      toast.success("직급이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all });
      toast.success("직급이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

- [ ] **Step 3: useTitles 훅 작성**

`apps/admin/hooks/useTitles.ts` — usePositions와 동일 패턴. `Position` → `Title` (id, name, sort_order, created_at, updated_at). API 경로 `/api/titles`. 토스트 메시지에 "직책" 사용. `onSuccess` invalidation에서 `queryKeys.titles.all`, `queryKeys.memberStatuses.all` 사용.

- [ ] **Step 4: 타입 체크**

Run: `pnpm check-types 2>&1 | tail -10`
Expected: admin 통과

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/lib/query-keys.ts apps/admin/hooks/usePositions.ts apps/admin/hooks/useTitles.ts
git commit -m "feat(admin): 직급/직책 React Query hooks 추가"
```

---

### Task 5: 직급/직책 관리 페이지 UI

**Files:**
- Create: `apps/admin/app/(dashboard)/job-titles/page.tsx`

- [ ] **Step 1: 관리 페이지 작성**

`apps/admin/app/(dashboard)/job-titles/page.tsx`:

페이지 구성:
- 상단 탭: "직급 관리" | "직책 관리"
- 각 탭에 테이블: 순서 | 이름 | (직급일 경우: 기본 연차, 가산 규칙) | 수정/삭제 버튼
- 추가 버튼 → Dialog로 입력 폼
- 수정 버튼 → Dialog로 편집 폼
- 삭제 → AlertDialog 확인

```typescript
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui/src/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui/src/select";
import {
  usePositions, useCreatePosition, useUpdatePosition, useDeletePosition,
  type Position,
} from "@/hooks/usePositions";
import {
  useTitles, useCreateTitle, useUpdateTitle, useDeleteTitle,
  type Title,
} from "@/hooks/useTitles";

const ACCRUAL_LABELS: Record<string, string> = {
  none: "없음",
  fixed: "고정",
  "+1_per_3yr": "3년마다 +1일",
};

export default function JobTitlesPage() {
  const [activeTab, setActiveTab] = useState<"positions" | "titles">("positions");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">직급/직책 관리</h1>

      {/* 탭 */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {[
          { value: "positions" as const, label: "직급 관리" },
          { value: "titles" as const, label: "직책 관리" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "positions" ? <PositionsPanel /> : <TitlesPanel />}
    </div>
  );
}

// ─── 직급 패널 ─────────────────────────────────
function PositionsPanel() {
  const { data: positions = [], isLoading } = usePositions();
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [annualDays, setAnnualDays] = useState(0);
  const [accrualRule, setAccrualRule] = useState("fixed");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSortOrder(positions.length + 1);
    setAnnualDays(0);
    setAccrualRule("fixed");
    setDialogOpen(true);
  };

  const openEdit = (p: Position) => {
    setEditing(p);
    setName(p.name);
    setSortOrder(p.sort_order);
    setAnnualDays(p.annual_leave_days);
    setAccrualRule(p.leave_accrual_rule);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = { name, sort_order: sortOrder, annual_leave_days: annualDays, leave_accrual_rule: accrualRule };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{positions.length}개 직급</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> 직급 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3 w-16">순서</th>
              <th className="px-4 py-3">직급명</th>
              <th className="px-4 py-3 w-24">기본 연차</th>
              <th className="px-4 py-3 w-32">가산 규칙</th>
              <th className="px-4 py-3 w-24 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">로딩 중...</td></tr>
            ) : positions.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-400">{p.sort_order}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.annual_leave_days}일</td>
                <td className="px-4 py-3 text-slate-500">{ACCRUAL_LABELS[p.leave_accrual_rule] ?? p.leave_accrual_rule}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 추가/수정 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "직급 수정" : "직급 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>직급명</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 선임" />
            </div>
            <div className="space-y-2">
              <Label>순서</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>기본 연차 (일)</Label>
              <Input type="number" value={annualDays} onChange={(e) => setAnnualDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>가산 규칙</Label>
              <Select value={accrualRule} onValueChange={setAccrualRule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="fixed">고정</SelectItem>
                  <SelectItem value="+1_per_3yr">3년마다 +1일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} disabled={!name || createMutation.isPending || updateMutation.isPending}>
              {editing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 AlertDialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>직급 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 직급을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── 직책 패널 ─────────────────────────────────
function TitlesPanel() {
  // PositionsPanel과 동일 패턴
  // 차이: 테이블 컬럼에서 "기본 연차", "가산 규칙" 제거
  // Dialog 폼에서 name, sort_order만 입력
  // hooks: useTitles, useCreateTitle, useUpdateTitle, useDeleteTitle
  // 토스트/라벨에 "직책" 사용
  // ... (PositionsPanel 코드를 기반으로 단순화)
}
```

TitlesPanel은 PositionsPanel에서 annual_leave_days, leave_accrual_rule 관련 부분을 제거한 버전이다. 컬럼: 순서 | 직책명 | 관리.

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types 2>&1 | tail -10`
Expected: admin 통과

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/app/\(dashboard\)/job-titles/
git commit -m "feat(admin): 직급/직책 관리 페이지 UI 추가"
```

---

### Task 6: 사이드바에 직급/직책 관리 메뉴 추가

**Files:**
- Modify: `apps/admin/components/Sidebar.tsx`

- [ ] **Step 1: 조직 관리 그룹에 메뉴 추가**

`Sidebar.tsx`의 "조직 관리" NavGroup items 배열에 추가:

```typescript
// 기존 조직 관리 items에 추가:
{ name: "직급/직책 관리", href: "/job-titles", icon: Grid3X3 },
```

"조직원 현황" 다음, "점심조 관리" 전에 배치한다.

- [ ] **Step 2: 타입 체크 + 브라우저 확인**

Run: `pnpm check-types 2>&1 | tail -10`
Run: `pnpm dev:admin` → 사이드바에서 "조직 관리 > 직급/직책 관리" 확인

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/components/Sidebar.tsx
git commit -m "feat(admin): 사이드바에 직급/직책 관리 메뉴 추가"
```

---

### Task 7: 조직원 현황 + 멤버 등록/수정에 직급/직책 반영

**Files:**
- Modify: `apps/admin/app/(dashboard)/member-status/page.tsx`
- Modify: `apps/admin/app/api/members/route.ts` (POST — 멤버 등록)
- Modify: `apps/admin/app/api/members/[id]/route.ts` (PUT — 멤버 수정)

- [ ] **Step 1: 멤버 등록 API에 position_id, title_id 추가**

`apps/admin/app/api/members/route.ts`의 POST 핸들러에서:
- request body에서 `position_id`, `title_id` 추출
- insert 데이터에 포함
- `position_id` 필수 검증 추가

- [ ] **Step 2: 멤버 수정 API에 position_id, title_id 추가**

`apps/admin/app/api/members/[id]/route.ts`의 PUT 핸들러에서:
- `body.position_id`, `body.title_id` 처리 추가 (기존 `member_role` 처리와 동일 패턴)

- [ ] **Step 3: 조직원 현황 페이지에 직급/직책 컬럼 추가**

`member-status/page.tsx` 테이블에:
- 기존 "직급" 컬럼 (`member_role` 표시) → `position_name` 표시로 변경
- "직책" 컬럼 추가 (`title_name` 표시, 없으면 "-")
- 멤버 등록/수정 Dialog에 직급 Select (positions 목록), 직책 Select (titles 목록, optional) 추가

- [ ] **Step 4: 타입 체크**

Run: `pnpm check-types 2>&1 | tail -10`
Expected: admin 통과

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/app/api/members/ apps/admin/app/\(dashboard\)/member-status/
git commit -m "feat(admin): 멤버 등록/수정/현황에 직급/직책 반영"
```

---

### Task 8: 사이드바 재구성 (근태 관리 그룹)

**Files:**
- Modify: `apps/admin/components/Sidebar.tsx`

- [ ] **Step 1: 근태 관리를 NavGroup으로 변경**

현재 "근태 관리"는 단일 NavItem(`/dayoffs`)이다. 이를 NavGroup으로 변경하여 하위 메뉴를 가질 수 있게 한다:

```typescript
// 기존:
{
  name: "근태 관리",
  href: "/dayoffs",
  icon: CalendarClock,
},

// 변경:
{
  name: "근태 관리",
  icon: CalendarClock,
  items: [
    { name: "휴가 관리", href: "/dayoffs", icon: CalendarDays },
  ],
},
```

Phase 2~4에서 "출퇴근 현황", "연차 현황", "승인 관리" 메뉴가 추가될 예정이므로 미리 그룹 구조를 만들어둔다.

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types 2>&1 | tail -10`
Expected: admin 통과

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/components/Sidebar.tsx
git commit -m "refactor(admin): 근태 관리를 NavGroup으로 변경 (하위 메뉴 확장 준비)"
```

---

### Task 9: 최종 검증

- [ ] **Step 1: 전체 타입 체크**

Run: `pnpm check-types 2>&1 | tail -20`
Expected: admin, part-time-supervisor 통과

- [ ] **Step 2: DB 리셋 검증**

Run: `supabase db reset 2>&1 | tail -10`
Expected: 모든 마이그레이션 + 시드 적용 성공

- [ ] **Step 3: 브라우저 검증**

Run: `pnpm dev:admin`
확인 사항:
1. 사이드바 "조직 관리 > 직급/직책 관리" 메뉴 노출
2. 직급 탭: 6개 직급 리스트 표시, 추가/수정/삭제 동작
3. 직책 탭: 3개 직책 리스트 표시, 추가/수정/삭제 동작
4. 사이드바 "근태 관리 > 휴가 관리" 하위 메뉴 구조
5. 조직원 현황: position_name, title_name 표시
