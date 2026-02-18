# 성능 최적화 (Vercel React Best Practices)

> 적용일: 2026-02-08 | 대상: `apps/user/`, `apps/admin/`

---

# Part 1. User App (`apps/user/`)

---

## U-1. react-snowfall 동적 import

**규칙**: `bundle-dynamic-imports` | **영향**: 초기 번들 ~10KB 절감

모든 페이지를 감싸는 layout에서 Snowfall을 즉시 로드하고 있어 초기 번들에 포함되었다.
`next/dynamic`으로 전환하여 hydration 이후 비동기 로드.

**파일**: `apps/user/app/(content)/layout.tsx`

```tsx
// Before
import Snowfall from "react-snowfall";

// After
import dynamic from "next/dynamic";
const Snowfall = dynamic(() => import("react-snowfall"), { ssr: false });
```

| 항목 | Before | After |
|------|--------|-------|
| 초기 JS 번들 | Snowfall 포함 (~10KB) | 제외 (lazy) |
| SSR 렌더링 | 불필요한 서버 렌더 시도 | `ssr: false`로 스킵 |
| FCP 영향 | 메인 청크에 포함 | 별도 청크, hydration 후 로드 |

---

## U-2. GachaMachine (GSAP) 동적 import

**규칙**: `bundle-dynamic-imports` | **영향**: 초기 번들 ~50KB 절감

GachaMachine은 Dialog 내부에서만 사용되지만 GSAP 애니메이션 라이브러리(~50KB)를 직접 import하고 있었다.

**파일**: `apps/user/app/(content)/lunch/page.tsx`

```tsx
// Before
import GachaMachine from "@/components/lunch/GachaMachine";

// After
const GachaMachine = dynamic(
  () => import("@/components/lunch/GachaMachine"),
  { ssr: false },
);
```

| 항목 | Before | After |
|------|--------|-------|
| 초기 JS 번들 | GSAP 포함 (~50KB) | 제외 (lazy) |
| 로드 시점 | 페이지 진입 즉시 | Dialog 열릴 때 로드 |
| lunch 페이지 LCP | GSAP 파싱 포함 | ~50KB 파싱 비용 제거 |

---

## U-3. Points Activity API 워터폴 제거

**규칙**: `async-parallel` | **영향**: API 응답 시간 ~40% 단축

권한 검증과 budget_summary 조회가 순차 실행되고 있었다. 두 쿼리는 독립적이므로 `Promise.all`로 병렬화.

**파일**: `apps/user/app/api/points/activity/route.ts`

```tsx
// Before — 순차 실행 (총 ~120ms)
const permission = await verifyActivityPermission(supabase, memberId); // ~60ms
if (!permission.allowed) return permission.error!;

const { data: summary } = await supabase                              // ~60ms
  .from("budget_summary")
  .select("*")
  .eq("member_id", memberId)
  .eq("type", "활동비")
  .eq("period", halfYearPeriod)
  .maybeSingle();

// After — 병렬 실행 (총 ~60ms)
const halfYearPeriod = toHalfYearPeriod(period);
const [permission, summaryResult] = await Promise.all([
  verifyActivityPermission(supabase, memberId),
  supabase
    .from("budget_summary")
    .select("*")
    .eq("member_id", memberId)
    .eq("type", "활동비")
    .eq("period", halfYearPeriod)
    .maybeSingle(),
]);

if (!permission.allowed) return permission.error!;
const { data: summary, error: summaryError } = summaryResult;
```

| 항목 | Before | After |
|------|--------|-------|
| DB 쿼리 패턴 | 순차 (permission → summary) | 병렬 (`Promise.all`) |
| 예상 응답 시간 | ~120ms (60+60) | ~60ms (max) |
| 후속 records 쿼리 | 변경 없음 (summary에 의존) | 변경 없음 |

---

## U-4. Zustand 셀렉터 최적화

**규칙**: `rerender-derived-state` | **영향**: 불필요 리렌더 제거

구조분해로 store 전체를 구독하면 어떤 필드가 변해도 컴포넌트가 리렌더된다.
개별 selector로 전환하여 해당 필드가 변할 때만 리렌더.

**파일**: `apps/user/app/(content)/dashboard/page.tsx`

```tsx
// Before — store 변경 시 항상 리렌더
const { formData, selectedDate: drawerSelectedDate, closeDrawer, resetForm }
  = useMealDrawerStore();
const { userId, userName, isLoggedIn, hydrate, hasHydrated }
  = useUserStore();

// After — 각 필드 변경 시에만 리렌더
const formData = useMealDrawerStore((s) => s.formData);
const drawerSelectedDate = useMealDrawerStore((s) => s.selectedDate);
const closeDrawer = useMealDrawerStore((s) => s.closeDrawer);
const resetForm = useMealDrawerStore((s) => s.resetForm);
const userId = useUserStore((s) => s.userId);
const userName = useUserStore((s) => s.userName);
const isLoggedIn = useUserStore((s) => s.isLoggedIn);
const hydrate = useUserStore((s) => s.hydrate);
const hasHydrated = useUserStore((s) => s.hasHydrated);
```

| 항목 | Before | After |
|------|--------|-------|
| 리렌더 트리거 | store 내 아무 필드 변경 | 구독 필드만 변경 시 |
| 영향 범위 | Dashboard 전체 트리 | 최소화 |
| Zustand 내부 비교 | 전체 객체 shallow compare | 개별 primitive compare |

---

## U-5. 비-원시 기본 prop 호이스팅

**규칙**: `rerender-memo-with-default-value` | **영향**: 불필요 리렌더 방지

함수 파라미터에 `= []`를 쓰면 매 렌더마다 새 배열 참조가 생성되어,
`React.memo`나 `useMemo` 의존성이 매번 변경된 것으로 판단된다.

**파일**: `apps/user/components/Calendar.tsx`

```tsx
// Before — 매 렌더마다 새 [] 참조 생성
export default function CalendarComponent({
  mealData = [],
}: Calendar21Props) {

// After — 모듈 레벨 상수로 참조 안정화
const EMPTY_MEAL_DATA: MealData[] = [];

export default function CalendarComponent({
  mealData = EMPTY_MEAL_DATA,
}: Calendar21Props) {
```

| 항목 | Before | After |
|------|--------|-------|
| 기본값 참조 | 매 렌더 새 객체 | 모듈 레벨 싱글턴 |
| 하위 memo 효과 | 무효화 가능 | 정상 동작 |

---

## U-6. 불필요한 force-dynamic 제거

**규칙**: Next.js 설정 정리 | **영향**: 코드 명확성

`"use client"` 컴포넌트에서 `export const dynamic = "force-dynamic"`은 무의미하다.
이 설정은 Server Component 전용이며, Client Component에서는 아무 효과가 없다.

**파일**: `apps/user/app/(content)/dashboard/page.tsx`

```tsx
// Before
"use client";
export const dynamic = "force-dynamic";

// After
"use client";
```

---

# Part 2. Admin App (`apps/admin/`)

---

## A-1. 유틸 함수 모듈 스코프 호이스팅

**규칙**: `rendering-hoist-jsx` | **영향**: 매 렌더마다 함수 재생성 방지

컴포넌트 내부에 정의된 순수 유틸 함수는 매 렌더마다 새 참조가 생성된다.
클로저 의존성이 없는 함수를 모듈 스코프로 이동하여 참조를 안정화.

**파일**: `apps/admin/app/(dashboard)/page.tsx`, `apps/admin/app/(dashboard)/users/page.tsx`

```tsx
// Before — 컴포넌트 내부에서 매 렌더마다 재생성
export default function DashboardPage() {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ko-KR").format(amount);
  const formatCurrencyShort = (amount: number) => { ... };
  // ...
}

// After — 모듈 스코프로 이동, 한 번만 생성
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const formatCurrencyShort = (amount: number) => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}천만`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(1)}만`;
  return formatCurrency(amount);
};

export default function DashboardPage() {
  // ...
}
```

| 항목 | Before | After |
|------|--------|-------|
| 함수 생성 시점 | 매 렌더마다 | 모듈 로드 시 1회 |
| GC 부담 | 렌더 횟수 × 함수 수 | 0 |
| 적용 파일 | `page.tsx`, `users/page.tsx` | 동일 2곳 |

---

## A-2. 상수 배열 모듈 스코프 호이스팅

**규칙**: `rerender-derived-state` | **영향**: 불필요한 재계산 및 참조 변경 방지

`Array.from()`으로 생성하는 `years`, `months` 배열이 컴포넌트 내부에서 매 렌더마다 새 참조로 생성되었다. 모듈 스코프 상수 또는 `useMemo`로 전환.

**파일**: `apps/admin/app/(dashboard)/users/page.tsx`

```tsx
// Before — 컴포넌트 내부에서 매 렌더마다 생성
export default function UsersPage() {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // ...
}

// After — 모듈 레벨 상수
const YEARS_RANGE = 5;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function UsersPage() {
  // years는 currentDate에 의존하므로 useMemo
  const years = useMemo(
    () => Array.from({ length: YEARS_RANGE }, (_, i) => currentDate.year() - 2 + i),
    [currentDate],
  );
  // ...
}
```

**파일**: `apps/admin/app/(dashboard)/page.tsx`

```tsx
// Before — 매 렌더마다 새 배열
const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

// After — useMemo로 참조 안정화
const years = useMemo(
  () => Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i),
  [currentDate]
);
const months = useMemo(
  () => Array.from({ length: 12 }, (_, i) => i + 1),
  []
);
```

| 항목 | Before | After |
|------|--------|-------|
| `months` 배열 참조 | 매 렌더 새 배열 | 모듈 싱글턴 or `useMemo` |
| `years` 배열 참조 | 매 렌더 새 배열 | `currentDate` 변경 시만 재계산 |
| 하위 컴포넌트 영향 | 매번 새 props 전달 | 참조 안정 |

---

## A-3. 파생 상태 useMemo 적용

**규칙**: `rerender-derived-state` | **영향**: Set 객체 불필요 재생성 방지

`SETTLEMENT_EXCLUDED_STATUSES`가 컴포넌트 내부에서 `new Set()`으로 매 렌더마다 생성되었고,
`excludedMemberNames`도 매 렌더마다 새 Set이 생성되었다.

**파일**: `apps/admin/app/(dashboard)/page.tsx`

```tsx
// Before — 매 렌더마다 Set 재생성
export default function DashboardPage() {
  const SETTLEMENT_EXCLUDED_STATUSES = new Set([
    "육아휴직", "병가", "파견", "휴직", "퇴사",
  ]);

  const excludedMemberNames = new Set(
    statusMembers
      ?.filter((m) => m.current_status && SETTLEMENT_EXCLUDED_STATUSES.has(m.current_status))
      .map((m) => m.full_name) || []
  );
  // ...
}

// After — Set은 모듈 스코프, 파생 Set은 useMemo
import { SETTLEMENT_EXCLUDED_STATUSES } from "@/lib/constants";

export default function DashboardPage() {
  const excludedMemberNames = useMemo(
    () =>
      new Set(
        statusMembers
          ?.filter((m) => m.current_status && SETTLEMENT_EXCLUDED_STATUSES.has(m.current_status))
          .map((m) => m.full_name) || []
      ),
    [statusMembers]
  );
  // ...
}
```

| 항목 | Before | After |
|------|--------|-------|
| `SETTLEMENT_EXCLUDED_STATUSES` | 매 렌더 `new Set()` | 모듈 레벨 싱글턴 |
| `excludedMemberNames` | 매 렌더 `new Set()` | `statusMembers` 변경 시만 재계산 |
| Set 생성 비용 | 렌더당 2회 | `statusMembers` 변경 시 1회 |

---

## A-4. Summary Stats 단일 패스 집계

**규칙**: `js-combine-iterations` | **영향**: 배열 순회 3회 → 1회

Users 페이지에서 `totalUsers`, `settledUsers`, `totalUsed` 세 값을 각각 `.length`, `.filter().length`, `.reduce()`로 구했다.
세 번의 배열 순회를 `useMemo` 내 단일 `for...of` 루프로 통합.

**파일**: `apps/admin/app/(dashboard)/users/page.tsx`

```tsx
// Before — 배열 3회 순회
const totalUsers = users?.length || 0;
const settledUsers = users?.filter((u) => u.is_settled).length || 0;
const totalUsed = users?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;

// After — 단일 패스 (useMemo)
const { totalUsers, settledUsers, totalUsed } = useMemo(() => {
  if (!users) return { totalUsers: 0, settledUsers: 0, totalUsed: 0 };
  let settled = 0;
  let used = 0;
  for (const u of users) {
    if (u.is_settled) settled++;
    used += u.total_used || 0;
  }
  return { totalUsers: users.length, settledUsers: settled, totalUsed: used };
}, [users]);
```

| 항목 | Before | After |
|------|--------|-------|
| 배열 순회 횟수 | 3회 (`.length` + `.filter` + `.reduce`) | 1회 (`for...of`) |
| 재계산 시점 | 매 렌더마다 | `users` 변경 시만 |
| 중간 배열 생성 | `.filter()` → 새 배열 1개 | 없음 |

---

## A-5. 중복 상수 공유 모듈로 추출 (DRY)

**규칙**: `rerender-derived-state` + DRY | **영향**: 중복 코드 제거 + 참조 통일

`STATUS_COLORS`, `SETTLEMENT_EXCLUDED_STATUSES`, `roleBadgeStyle`가 4개 페이지에 각각 중복 정의되어 있었다.
공유 `lib/constants.ts`로 추출하여 단일 소스로 통합.

**파일**: `apps/admin/lib/constants.ts` (신규)

```tsx
/** 특이사항 상태별 배지 색상 */
export const STATUS_COLORS: Record<string, string> = {
  정상: "bg-emerald-50 text-emerald-700 border-emerald-200",
  육아휴직: "bg-pink-50 text-pink-700 border-pink-200",
  병가: "bg-red-50 text-red-700 border-red-200",
  재택근무: "bg-cyan-50 text-cyan-700 border-cyan-200",
  파견: "bg-indigo-50 text-indigo-700 border-indigo-200",
  휴직: "bg-amber-50 text-amber-700 border-amber-200",
  퇴사: "bg-slate-100 text-slate-500 border-slate-300",
};

/** 정산 제외 대상 상태 */
export const SETTLEMENT_EXCLUDED_STATUSES = new Set([
  "육아휴직", "병가", "파견", "휴직", "퇴사",
]);

/** 직책별 배지 색상 */
export function roleBadgeStyle(role: string) { ... }
```

**Import 변경 대상 (4개 파일)**:

| 파일 | 제거된 로컬 정의 | import |
|------|----------------|--------|
| `page.tsx` (Dashboard) | `STATUS_COLORS`, `SETTLEMENT_EXCLUDED_STATUSES` | `{ STATUS_COLORS, SETTLEMENT_EXCLUDED_STATUSES }` |
| `organization/page.tsx` | `STATUS_COLORS`, `roleBadgeStyle` | `{ STATUS_COLORS, roleBadgeStyle }` |
| `member-status/page.tsx` | `STATUS_COLORS` | `{ STATUS_COLORS }` |
| `monthly/page.tsx` | `STATUS_COLORS` | `{ STATUS_COLORS }` |

| 항목 | Before | After |
|------|--------|-------|
| `STATUS_COLORS` 정의 | 4곳 중복 | 1곳 (`lib/constants.ts`) |
| `roleBadgeStyle` 정의 | 2곳 중복 | 1곳 |
| 모듈 레벨 Set 인스턴스 | 페이지별 각 1개 | 전체 1개 (공유) |
| 유지보수 | 상태 추가 시 4곳 수정 필요 | 1곳만 수정 |

---

## A-6. 리스트 아이템 React.memo 적용

**규칙**: `rerender-memo` | **영향**: 리스트 리렌더 최소화

Organization 페이지의 `MemberRow`와 `UnassignedMemberRow`는 부모 상태(다이얼로그 열기, 체크박스 토글 등)가 변경될 때마다 전체 리스트가 리렌더되었다.
`React.memo()`로 감싸 자신의 props가 변경될 때만 리렌더.

**파일**: `apps/admin/app/(dashboard)/organization/page.tsx`

```tsx
// Before — 부모 렌더마다 모든 행 리렌더
function MemberRow({ member, onEdit, onDelete, status }: { ... }) {
  return ( ... );
}

function UnassignedMemberRow({ member, checked, onToggle, status }: { ... }) {
  return ( ... );
}

// After — props 변경 시에만 리렌더
const MemberRow = memo(function MemberRow({ member, onEdit, onDelete, status }: { ... }) {
  return ( ... );
});

const UnassignedMemberRow = memo(function UnassignedMemberRow({ member, checked, onToggle, status }: { ... }) {
  return ( ... );
});
```

| 항목 | Before | After |
|------|--------|-------|
| 리렌더 조건 | 부모 렌더 시 항상 | 자신의 props 변경 시만 |
| 30명 리스트 기준 | 다이얼로그 열기 → 30행 전부 리렌더 | 변경된 행만 리렌더 |
| 체크박스 토글 | 30행 전부 리렌더 | 토글된 1행만 리렌더 |

---

# 종합 요약

## 전체 최적화 목록

### User App (6건)

| # | 최적화 | 규칙 | 절감 효과 |
|---|--------|------|----------|
| U-1 | Snowfall lazy load | `bundle-dynamic-imports` | 초기 번들 ~10KB ↓ |
| U-2 | GachaMachine lazy load | `bundle-dynamic-imports` | 초기 번들 ~50KB ↓ |
| U-3 | Activity API 병렬화 | `async-parallel` | API 응답 ~40% ↓ |
| U-4 | Zustand selector | `rerender-derived-state` | Dashboard 리렌더 ↓ |
| U-5 | Default prop 호이스팅 | `rerender-memo-with-default-value` | Calendar 리렌더 ↓ |
| U-6 | force-dynamic 제거 | 설정 정리 | 코드 명확성 ↑ |

### Admin App (6건)

| # | 최적화 | 규칙 | 절감 효과 |
|---|--------|------|----------|
| A-1 | 유틸 함수 모듈 스코프 호이스팅 | `rendering-hoist-jsx` | 함수 재생성 제거 |
| A-2 | 상수 배열 모듈 스코프/useMemo | `rerender-derived-state` | 배열 참조 안정화 |
| A-3 | 파생 상태 useMemo 적용 | `rerender-derived-state` | Set 재생성 제거 |
| A-4 | Summary Stats 단일 패스 집계 | `js-combine-iterations` | 배열 순회 3회 → 1회 |
| A-5 | 중복 상수 공유 모듈 추출 | DRY + `rerender-derived-state` | 4곳 → 1곳 통합 |
| A-6 | 리스트 아이템 React.memo | `rerender-memo` | 리스트 리렌더 최소화 |

## 적용된 규칙 분포

| 규칙 | User | Admin | 합계 |
|------|------|-------|------|
| `bundle-dynamic-imports` | 2 | - | 2 |
| `async-parallel` | 1 | - | 1 |
| `rerender-derived-state` | 1 | 3 | 4 |
| `rerender-memo-with-default-value` | 1 | - | 1 |
| `rendering-hoist-jsx` | - | 1 | 1 |
| `js-combine-iterations` | - | 1 | 1 |
| `rerender-memo` | - | 1 | 1 |
| 설정 정리 | 1 | - | 1 |
| **합계** | **6** | **6** | **12** |

## 변경 파일 전체 목록

### User App (5파일)

| 파일 | 변경 유형 |
|------|----------|
| `apps/user/app/(content)/layout.tsx` | Snowfall 동적 import |
| `apps/user/app/(content)/lunch/page.tsx` | GachaMachine 동적 import |
| `apps/user/app/api/points/activity/route.ts` | Promise.all 병렬화 |
| `apps/user/app/(content)/dashboard/page.tsx` | Zustand selector, force-dynamic 제거 |
| `apps/user/components/Calendar.tsx` | 기본 prop 호이스팅 |

### Admin App (6파일)

| 파일 | 변경 유형 |
|------|----------|
| `apps/admin/lib/constants.ts` | **신규** — 공유 상수/유틸 |
| `apps/admin/app/(dashboard)/page.tsx` | 호이스팅, useMemo, 상수 import |
| `apps/admin/app/(dashboard)/users/page.tsx` | 호이스팅, useMemo, 단일 패스 |
| `apps/admin/app/(dashboard)/organization/page.tsx` | React.memo, 상수 import |
| `apps/admin/app/(dashboard)/member-status/page.tsx` | 상수 import |
| `apps/admin/app/(dashboard)/monthly/page.tsx` | 상수 import |

## 이미 잘 되어 있는 부분

### 공통
- `@repo/ui/src/*` 직접 import (barrel file 회피)

### User App
- `MealEntryDrawer`, `WeeklySchedule` 동적 import
- React Query `staleTime`/`gcTime` 적절한 설정
- Calendar 콜백 `useCallback` 적용

### Admin App
- React Query `queryKeys` 팩토리 패턴 사용
- `useCallback`으로 이벤트 핸들러 메모이제이션
- Zustand 셀렉터 패턴 (admin은 직접 store 미사용)
- Supabase 클라이언트 모듈 레벨 인스턴스화
