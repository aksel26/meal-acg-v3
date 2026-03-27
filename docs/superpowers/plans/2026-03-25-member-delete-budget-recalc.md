# 인원 삭제 시 활동비 자동 재계산 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인턴/팀원 삭제 시 해당 팀장과 P&C팀장의 활동비를 자동으로 재계산하여 budget_allocations에 반영한다.

**Architecture:** 삭제 다이얼로그를 member_role에 따라 분기 처리한다. 인턴은 실제 근무 개월 입력 후 intern_months 업데이트 → 재계산 → 삭제 순서로 진행. 팀원은 바로 재계산 → 삭제. 재계산 API는 기존 calculate_activity_budget RPC를 활용하되, 서버에서 팀장 식별 및 P&C팀장 연쇄 재계산을 처리한다.

**Tech Stack:** Next.js 15, React 19, Supabase RPC, TanStack React Query, Radix UI Dialog

**Spec:** `docs/superpowers/specs/2026-03-25-member-delete-budget-recalc-design.md`

---

### Task 1: 서버 API - 삭제 시 활동비 재계산 엔드포인트

**Files:**
- Create: `apps/admin/app/api/budget-allocations/recalc-on-delete/route.ts`

이 API는 삭제 대상 멤버의 팀장과 P&C팀장의 활동비를 재계산하여 budget_allocations를 업데이트한다.

- [ ] **Step 1: API 라우트 생성**

`apps/admin/app/api/budget-allocations/recalc-on-delete/route.ts` 생성:

```typescript
// POST /api/budget-allocations/recalc-on-delete
// Body: { member_id, period, intern_actual_months?, manager_rate, pnc_extra_rate }
//
// 1. 삭제 대상 멤버의 team_id, member_role 조회
// 2. 해당 팀의 팀장 찾기
// 3. 팀장의 활동비 재계산 (calculate_activity_budget RPC)
// 4. P&C팀장의 활동비 재계산 (pncExtraCount 변동)
// 5. budget_allocations 업데이트
```

처리 순서:
1. 삭제 대상 멤버 정보 조회 (team_id, member_role)
2. 인턴인 경우: intern_actual_months로 intern_months 업데이트
3. 해당 팀의 팀장(member_role='팀장' 또는 '본부장') 찾기
4. 팀장의 활동비 재계산 → budget_allocations 업데이트
5. P&C팀장 식별 → P&C팀장 활동비 재계산 → budget_allocations 업데이트
6. 삭제 대상이 P&C팀 소속이면 자기 팀장이 곧 P&C팀장이므로 중복 방지

- [ ] **Step 2: 동작 확인**

dev 서버에서 API 호출 테스트 (curl 또는 브라우저 콘솔).

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/app/api/budget-allocations/recalc-on-delete/route.ts
git commit -m "feat(admin): 인원 삭제 시 활동비 재계산 API 추가"
```

---

### Task 2: 삭제 다이얼로그 수정 - 인턴 근무 개월 입력

**Files:**
- Modify: `apps/admin/app/(dashboard)/member-status/page.tsx`

기존 삭제 다이얼로그에 인턴인 경우 근무 개월 입력 필드를 추가한다.

- [ ] **Step 1: deletingItem 타입에 member_role, intern_months, team_id 추가**

현재 `deletingItem` 상태:
```typescript
{ id: string, memberId: string, name: string, status: string }
```

확장:
```typescript
{ id: string, memberId: string, name: string, status: string,
  memberRole?: string, internMonths?: number, teamId?: string }
```

삭제 버튼 onClick에서 해당 row의 member_role, intern_months, team_id를 함께 전달.

- [ ] **Step 2: 인턴용 근무 개월 입력 UI 추가**

삭제 다이얼로그 내부에 조건부 렌더링:
```tsx
{deletingItem?.memberRole === "인턴" && (
  <div className="space-y-1.5">
    <Label htmlFor="actual-months">실제 근무 개월</Label>
    <Input
      id="actual-months"
      type="number"
      min={1}
      max={deletingItem.internMonths || 6}
      value={actualMonths}
      onChange={(e) => setActualMonths(parseInt(e.target.value) || 1)}
    />
    <p className="text-xs text-slate-400">
      기존 등록: {deletingItem.internMonths}개월
    </p>
  </div>
)}
```

`actualMonths` state 추가, 기본값은 `deletingItem.internMonths`.

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/app/\(dashboard\)/member-status/page.tsx
git commit -m "feat(admin): 인턴 삭제 시 실제 근무 개월 입력 UI 추가"
```

---

### Task 3: 삭제 핸들러에 재계산 로직 연결

**Files:**
- Modify: `apps/admin/app/(dashboard)/member-status/page.tsx`

- [ ] **Step 1: handleDeleteConfirm 수정**

삭제 전에 재계산 API를 호출하도록 변경. 팀장 삭제 시에는 재계산 건너뛰기.

```typescript
const handleDeleteConfirm = async () => {
  if (!deletingItem?.memberId) {
    // 특이사항만 삭제
    deleteStatus.mutate(deletingItem!.id, { onSuccess: closeDeleteDialog });
    return;
  }

  const role = deletingItem.memberRole;

  // 팀장은 재계산 없이 바로 삭제
  if (role === "팀장" || role === "본부장") {
    deleteMemberMutation.mutate(deletingItem.memberId, { onSuccess: closeDeleteDialog });
    return;
  }

  // 인턴/팀원: 재계산 후 삭제
  try {
    const currentMonth = new Date().getMonth() + 1;
    const period = `${new Date().getFullYear()}-${currentMonth <= 6 ? "H1" : "H2"}`;

    await fetch("/api/budget-allocations/recalc-on-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: deletingItem.memberId,
        period,
        intern_actual_months: role === "인턴" ? actualMonths : undefined,
      }),
    });

    deleteMemberMutation.mutate(deletingItem.memberId, { onSuccess: closeDeleteDialog });
  } catch {
    toast.error("활동비 재계산에 실패했습니다.");
  }
};
```

- [ ] **Step 2: budget 관련 쿼리 무효화 확인**

기존 `deleteMemberMutation`의 onSuccess에 이미 `budgetAllocations.all`과 `budgetSummary.all` 무효화가 포함되어 있음을 확인. (line 196-197에 이미 있음)

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/app/\(dashboard\)/member-status/page.tsx
git commit -m "feat(admin): 인턴/팀원 삭제 시 활동비 자동 재계산 연결"
```

---

### Task 4: 통합 테스트 및 엣지 케이스 확인

- [ ] **Step 1: 인턴 삭제 시나리오 테스트**

1. budget 페이지에서 활동비 자동 계산 → 저장
2. member-status 페이지에서 인턴(퇴사 상태) 삭제
3. 근무 개월 입력 다이얼로그 확인 (기본값 = 기존 intern_months)
4. 삭제 후 budget 페이지에서 해당 팀장 금액 변경 확인

- [ ] **Step 2: 팀원 삭제 시나리오 테스트**

1. member-status 페이지에서 팀원(퇴사 상태) 삭제
2. 재계산 다이얼로그 없이 바로 삭제 확인
3. budget 페이지에서 해당 팀장 금액 변경 확인

- [ ] **Step 3: P&C팀 연쇄 재계산 테스트**

1. P&C팀 외 팀의 인턴/팀원 삭제
2. P&C팀장의 pncExtraCount 기반 금액도 변경되었는지 확인

- [ ] **Step 4: 팀장 삭제 시나리오 테스트**

1. 팀장(퇴사 상태) 삭제
2. 재계산 없이 cascade 삭제만 되는지 확인
