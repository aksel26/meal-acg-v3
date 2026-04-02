# 출퇴근 관리 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User 앱에 출퇴근 관리 페이지를 추가하여 모바일(캘린더+카드)과 PC(테이블) 뷰로 월간 출퇴근 내역을 조회하고 근태 수정 요청을 할 수 있게 한다.

**Architecture:** 단일 `/attendance` 라우트에서 CSS 분기(`md:hidden` / `max-md:hidden`)로 모바일/PC 뷰를 분리한다. 데이터 훅은 페이지 레벨에서 공유하고 렌더링 컴포넌트만 분리한다. 기존 `attendance_records` 테이블에 `attendance_type` 컬럼을 추가하고, 수정 요청용 `attendance_modification_requests` 테이블을 신규 생성한다.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack React Query, Zustand, motion, Supabase, Radix UI (`@repo/ui`)

**프로젝트 참고사항:**
- 테스트 프레임워크 미구성 → TDD 생략, 수동 검증
- 커밋 메시지: 한국어 + prefix (feat/fix/refactor)
- Co-Authored-By 포함하지 않음
- import 규칙: `@repo/ui/src/{component}`, `from "sonner"` 직접 import 금지

---

## 파일 구조

### 신규 생성

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260403_add_attendance_type.sql` | attendance_records에 attendance_type 컬럼 추가 |
| `supabase/migrations/20260403_create_attendance_modification_requests.sql` | 수정 요청 테이블 생성 |
| `apps/user/app/api/attendance/monthly/route.ts` | 월간 출퇴근 내역 API |
| `apps/user/app/api/attendance/modify/route.ts` | 근태 수정 요청 API (GET/POST) |
| `apps/user/hooks/use-attendance-monthly.ts` | 월간 데이터 query 훅 |
| `apps/user/hooks/use-attendance-modify.ts` | 수정 요청 mutation + query 훅 |
| `apps/user/app/(content)/attendance/page.tsx` | 출퇴근 관리 페이지 |
| `apps/user/components/attendance/MonthSelector.tsx` | 월 선택기 |
| `apps/user/components/attendance/AttendanceCalendar.tsx` | 주간/월간 토글 캘린더 |
| `apps/user/components/attendance/AttendanceCard.tsx` | 선택 날짜 출퇴근 카드 |
| `apps/user/components/attendance/AttendanceMobileView.tsx` | 모바일 뷰 조합 |
| `apps/user/components/attendance/AttendanceTable.tsx` | PC 테이블 |
| `apps/user/components/attendance/AttendanceFilter.tsx` | 근태 유형 필터 |
| `apps/user/components/attendance/AttendanceDesktopView.tsx` | PC 뷰 조합 |
| `apps/user/components/attendance/AttendanceModifyDrawer.tsx` | 근태 수정 요청 Drawer |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `apps/user/lib/query-keys.ts` | `attendance` 키에 `monthly`, `modifyRequests` 추가 |
| `apps/user/lib/supabase/types.ts` | `attendance_type` 컬럼 + 신규 테이블 타입 추가 |

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/20260403_add_attendance_type.sql`
- Create: `supabase/migrations/20260403_create_attendance_modification_requests.sql`

- [ ] **Step 1: attendance_records에 attendance_type 컬럼 추가 마이그레이션 작성**

```sql
-- supabase/migrations/20260403_add_attendance_type.sql
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT '근무';

COMMENT ON COLUMN attendance_records.attendance_type IS '근태 유형: 근무, 휴가, 재택, 외근';
```

- [ ] **Step 2: attendance_modification_requests 테이블 생성 마이그레이션 작성**

```sql
-- supabase/migrations/20260403_create_attendance_modification_requests.sql
CREATE TABLE IF NOT EXISTS attendance_modification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  original_type text NOT NULL,
  requested_type text NOT NULL,
  reason text NOT NULL,
  approval_status text NOT NULL DEFAULT '미승인',
  first_approver_id uuid REFERENCES members(id),
  first_approved_at timestamptz,
  final_approver_id uuid REFERENCES members(id),
  final_approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_attendance_mod_req_record ON attendance_modification_requests(attendance_record_id);
CREATE INDEX idx_attendance_mod_req_requester ON attendance_modification_requests(requester_id);
CREATE INDEX idx_attendance_mod_req_status ON attendance_modification_requests(approval_status);

COMMENT ON TABLE attendance_modification_requests IS '근태 유형 수정 요청 (P&C 더블체크 승인)';
```

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260403_add_attendance_type.sql supabase/migrations/20260403_create_attendance_modification_requests.sql
git commit -m "feat: 출퇴근 관리 DB 마이그레이션 추가 (attendance_type + modification_requests)"
```

---

## Task 2: Supabase 타입 + Query Keys 업데이트

**Files:**
- Modify: `apps/user/lib/supabase/types.ts`
- Modify: `apps/user/lib/query-keys.ts`

- [ ] **Step 1: types.ts에 attendance_type 컬럼 추가**

`apps/user/lib/supabase/types.ts`의 `attendance_records` 타입 정의에 `attendance_type` 필드를 추가한다:

Row:
```typescript
attendance_type: string
```

Insert:
```typescript
attendance_type?: string
```

Update:
```typescript
attendance_type?: string
```

- [ ] **Step 2: types.ts에 attendance_modification_requests 테이블 타입 추가**

`attendance_records` 정의 바로 뒤에 추가:

```typescript
attendance_modification_requests: {
  Row: {
    id: string
    attendance_record_id: string
    requester_id: string
    original_type: string
    requested_type: string
    reason: string
    approval_status: string
    first_approver_id: string | null
    first_approved_at: string | null
    final_approver_id: string | null
    final_approved_at: string | null
    reject_reason: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    attendance_record_id: string
    requester_id: string
    original_type: string
    requested_type: string
    reason: string
    approval_status?: string
    first_approver_id?: string | null
    first_approved_at?: string | null
    final_approver_id?: string | null
    final_approved_at?: string | null
    reject_reason?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    attendance_record_id?: string
    requester_id?: string
    original_type?: string
    requested_type?: string
    reason?: string
    approval_status?: string
    first_approver_id?: string | null
    first_approved_at?: string | null
    final_approver_id?: string | null
    final_approved_at?: string | null
    reject_reason?: string | null
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "attendance_modification_requests_attendance_record_id_fkey"
      columns: ["attendance_record_id"]
      isOneToOne: false
      referencedRelation: "attendance_records"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "attendance_modification_requests_requester_id_fkey"
      columns: ["requester_id"]
      isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
  ]
}
```

- [ ] **Step 3: query-keys.ts에 월간 + 수정 요청 키 추가**

`apps/user/lib/query-keys.ts`의 `attendance` 객체를 수정:

```typescript
// 출퇴근 기록
attendance: {
  all: ["attendance"] as const,
  byDate: (memberId: string, date: string) =>
    ["attendance", memberId, date] as const,
  today: ["attendance", "today"] as const,
  monthly: (memberId: string, year: number, month: number) =>
    ["attendance", "monthly", memberId, year, month] as const,
  modifyRequests: {
    all: ["attendance", "modifyRequests"] as const,
    byMember: (memberId: string) =>
      ["attendance", "modifyRequests", memberId] as const,
  },
},
```

- [ ] **Step 4: 커밋**

```bash
git add apps/user/lib/supabase/types.ts apps/user/lib/query-keys.ts
git commit -m "feat: 출퇴근 관리 타입 및 query keys 업데이트"
```

---

## Task 3: 월간 조회 API

**Files:**
- Create: `apps/user/app/api/attendance/monthly/route.ts`

- [ ] **Step 1: 월간 출퇴근 조회 API 작성**

```typescript
// apps/user/app/api/attendance/monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// GET /api/attendance/monthly?memberId=xxx&year=2026&month=4
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!memberId || !year || !month) {
      return NextResponse.json(
        { error: "memberId, year, month는 필수입니다." },
        { status: 400 }
      );
    }

    const startDate = dayjs
      .tz(`${year}-${month.padStart(2, "0")}-01`, "Asia/Seoul")
      .format("YYYY-MM-DD");
    const endDate = dayjs
      .tz(`${year}-${month.padStart(2, "0")}-01`, "Asia/Seoul")
      .endOf("month")
      .format("YYYY-MM-DD");

    // 출퇴근 기록 조회
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching monthly attendance:", error);
      return NextResponse.json(
        { error: "월간 출퇴근 내역 조회 실패" },
        { status: 500 }
      );
    }

    // 해당 레코드들의 수정 요청 상태 조회
    const recordIds = (records || []).map((r) => r.id);
    let modificationMap: Record<string, string> = {};

    if (recordIds.length > 0) {
      const { data: modifications } = await supabase
        .from("attendance_modification_requests")
        .select("attendance_record_id, approval_status")
        .in("attendance_record_id", recordIds)
        .neq("approval_status", "반려");

      if (modifications) {
        modificationMap = Object.fromEntries(
          modifications.map((m) => [m.attendance_record_id, m.approval_status])
        );
      }
    }

    // work_minutes 계산 + 응답 조립
    const enrichedRecords = (records || []).map((r) => {
      let workMinutes = 0;
      if (r.check_in_at && r.check_out_at) {
        workMinutes = Math.floor(
          (new Date(r.check_out_at).getTime() -
            new Date(r.check_in_at).getTime()) /
            60000
        );
      }

      return {
        id: r.id,
        date: r.date,
        check_in_at: r.check_in_at,
        check_out_at: r.check_out_at,
        attendance_type: r.attendance_type ?? "근무",
        status: r.status,
        overtime_minutes: r.overtime_minutes ?? 0,
        is_weekend: r.is_weekend ?? false,
        work_minutes: workMinutes,
        modification_status: modificationMap[r.id] ?? null,
      };
    });

    // 서머리 계산
    const workRecords = enrichedRecords.filter(
      (r) => r.attendance_type === "근무" || r.attendance_type === "외근"
    );
    const summary = {
      total_work_days: workRecords.filter((r) => r.check_in_at).length,
      total_work_minutes: workRecords.reduce(
        (sum, r) => sum + r.work_minutes,
        0
      ),
      total_overtime_minutes: workRecords.reduce(
        (sum, r) => sum + r.overtime_minutes,
        0
      ),
      late_count: workRecords.filter((r) => r.status === "late").length,
      early_leave_count: workRecords.filter((r) => r.status === "early_leave")
        .length,
    };

    return NextResponse.json({ records: enrichedRecords, summary });
  } catch (error) {
    console.error("Monthly attendance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 수동 검증**

브라우저나 curl로 `/api/attendance/monthly?memberId=<id>&year=2026&month=4` 호출하여 응답 형태 확인.

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/attendance/monthly/route.ts
git commit -m "feat: 월간 출퇴근 내역 조회 API 추가"
```

---

## Task 4: 근태 수정 요청 API

**Files:**
- Create: `apps/user/app/api/attendance/modify/route.ts`

- [ ] **Step 1: 수정 요청 API 작성 (GET + POST)**

```typescript
// apps/user/app/api/attendance/modify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/attendance/modify?memberId=xxx - 내 수정 요청 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId가 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_modification_requests")
      .select(
        `
        *,
        attendance_record:attendance_records!attendance_modification_requests_attendance_record_id_fkey(
          id, date, attendance_type, check_in_at, check_out_at
        )
      `
      )
      .eq("requester_id", memberId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching modify requests:", error);
      return NextResponse.json(
        { error: "수정 요청 목록 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Modify request GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/modify - 근태 수정 요청 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { attendanceRecordId, requesterId, originalType, requestedType, reason } =
      await request.json();

    if (!attendanceRecordId || !requesterId || !originalType || !requestedType || !reason) {
      return NextResponse.json(
        { error: "모든 필드는 필수입니다." },
        { status: 400 }
      );
    }

    // 같은 레코드에 대해 진행 중인 요청이 있는지 확인
    const { data: existing } = await supabase
      .from("attendance_modification_requests")
      .select("id")
      .eq("attendance_record_id", attendanceRecordId)
      .in("approval_status", ["미승인", "가승인"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "이미 진행 중인 수정 요청이 있습니다." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_modification_requests")
      .insert({
        attendance_record_id: attendanceRecordId,
        requester_id: requesterId,
        original_type: originalType,
        requested_type: requestedType,
        reason,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating modify request:", error);
      return NextResponse.json(
        { error: "수정 요청 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Modify request POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/app/api/attendance/modify/route.ts
git commit -m "feat: 근태 수정 요청 API 추가 (GET/POST)"
```

---

## Task 5: React Query 훅

**Files:**
- Create: `apps/user/hooks/use-attendance-monthly.ts`
- Create: `apps/user/hooks/use-attendance-modify.ts`

- [ ] **Step 1: 월간 조회 훅 작성**

```typescript
// apps/user/hooks/use-attendance-monthly.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_type: string;
  status: string;
  overtime_minutes: number;
  is_weekend: boolean;
  work_minutes: number;
  modification_status: string | null;
}

export interface AttendanceSummary {
  total_work_days: number;
  total_work_minutes: number;
  total_overtime_minutes: number;
  late_count: number;
  early_leave_count: number;
}

interface AttendanceMonthlyResponse {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export function useAttendanceMonthly(
  memberId: string | null,
  year: number,
  month: number
) {
  return useQuery<AttendanceMonthlyResponse>({
    queryKey: queryKeys.attendance.monthly(memberId || "", year, month),
    queryFn: async () => {
      const params = new URLSearchParams({
        memberId: memberId!,
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/attendance/monthly?${params}`);
      if (!res.ok) throw new Error("월간 출퇴근 내역 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
    staleTime: 60 * 1000,
  });
}
```

- [ ] **Step 2: 수정 요청 훅 작성**

```typescript
// apps/user/hooks/use-attendance-modify.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

interface ModifyRequestPayload {
  attendanceRecordId: string;
  requesterId: string;
  originalType: string;
  requestedType: string;
  reason: string;
}

export interface ModifyRequest {
  id: string;
  attendance_record_id: string;
  requester_id: string;
  original_type: string;
  requested_type: string;
  reason: string;
  approval_status: string;
  created_at: string;
  attendance_record: {
    id: string;
    date: string;
    attendance_type: string;
    check_in_at: string | null;
    check_out_at: string | null;
  } | null;
}

export function useAttendanceModifyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ModifyRequestPayload) => {
      const res = await fetch("/api/attendance/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "수정 요청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.modifyRequests.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.all,
      });
      toast.success("근태 수정 요청이 제출되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMyModifyRequests(memberId: string | null) {
  return useQuery<ModifyRequest[]>({
    queryKey: queryKeys.attendance.modifyRequests.byMember(memberId || ""),
    queryFn: async () => {
      const params = new URLSearchParams({ memberId: memberId! });
      const res = await fetch(`/api/attendance/modify?${params}`);
      if (!res.ok) throw new Error("수정 요청 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/hooks/use-attendance-monthly.ts apps/user/hooks/use-attendance-modify.ts
git commit -m "feat: 출퇴근 월간 조회 및 수정 요청 React Query 훅 추가"
```

---

## Task 6: 공용 컴포넌트 — MonthSelector

**Files:**
- Create: `apps/user/components/attendance/MonthSelector.tsx`

- [ ] **Step 1: MonthSelector 컴포넌트 작성**

기존 dayoffs 페이지의 월 선택 패턴을 따르되, 좌우 화살표 + 년월 텍스트 표시.

```typescript
// apps/user/components/attendance/MonthSelector.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface MonthSelectorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function MonthSelector({
  year,
  month,
  onMonthChange,
}: MonthSelectorProps) {
  const handlePrev = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrev}
        className="p-2 rounded-xl hover:bg-[oklch(0.95_0.01_250)] transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-[oklch(0.45_0.02_250)]" />
      </motion.button>

      <h2 className="text-lg font-semibold text-[oklch(0.25_0.02_250)]">
        {year}년 {month}월
      </h2>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleNext}
        className="p-2 rounded-xl hover:bg-[oklch(0.95_0.01_250)] transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-[oklch(0.45_0.02_250)]" />
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/MonthSelector.tsx
git commit -m "feat: 출퇴근 관리 MonthSelector 컴포넌트 추가"
```

---

## Task 7: 모바일 — AttendanceCalendar (주간/월간 토글)

**Files:**
- Create: `apps/user/components/attendance/AttendanceCalendar.tsx`

- [ ] **Step 1: 주간/월간 토글 캘린더 작성**

```typescript
// apps/user/components/attendance/AttendanceCalendar.tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { AttendanceRecord } from "@/hooks/use-attendance-monthly";

dayjs.locale("ko");

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TYPE_COLORS: Record<string, string> = {
  근무: "bg-[oklch(0.55_0.18_250)]",
  휴가: "bg-[oklch(0.65_0.20_150)]",
  재택: "bg-[oklch(0.65_0.15_60)]",
  외근: "bg-[oklch(0.60_0.18_310)]",
};

interface AttendanceCalendarProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
}

export default function AttendanceCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  records,
}: AttendanceCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      map[r.date] = r;
    });
    return map;
  }, [records]);

  const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");

  // 현재 월의 모든 날짜 생성
  const monthStart = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
  const daysInMonth = monthStart.daysInMonth();
  const startDayOfWeek = monthStart.day();

  const allDays = useMemo(() => {
    const days: (string | null)[] = [];
    // 첫 주 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(
        dayjs(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`).format("YYYY-MM-DD")
      );
    }
    return days;
  }, [year, month, daysInMonth, startDayOfWeek]);

  // 주 단위로 분할
  const weeks = useMemo(() => {
    const result: (string | null)[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    // 마지막 주가 7개 미만이면 null로 채움
    const lastWeek = result[result.length - 1];
    if (lastWeek && lastWeek.length < 7) {
      while (lastWeek.length < 7) {
        lastWeek.push(null);
      }
    }
    return result;
  }, [allDays]);

  // 선택된 날짜가 포함된 주 인덱스
  const selectedWeekIndex = useMemo(() => {
    if (!selectedDate) {
      // 오늘이 현재 월에 있으면 오늘 주, 아니면 첫 주
      const todayInMonth = weeks.findIndex((week) =>
        week.some((d) => d === today)
      );
      return todayInMonth >= 0 ? todayInMonth : 0;
    }
    const idx = weeks.findIndex((week) =>
      week.some((d) => d === selectedDate)
    );
    return idx >= 0 ? idx : 0;
  }, [selectedDate, weeks, today]);

  const visibleWeeks = isExpanded ? weeks : [weeks[selectedWeekIndex]].filter(Boolean);

  return (
    <div className="card-premium rounded-2xl p-4 overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-[oklch(0.55_0.01_250)]"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : `week-${selectedWeekIndex}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-y-1">
              {week.map((dateStr, di) => {
                if (!dateStr) {
                  return <div key={`empty-${wi}-${di}`} className="h-10" />;
                }

                const d = dayjs(dateStr);
                const dayNum = d.date();
                const dayOfWeek = d.day();
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const record = recordMap[dateStr];
                const dotColor = record
                  ? TYPE_COLORS[record.attendance_type] || TYPE_COLORS["근무"]
                  : null;
                const isLateOrEarly =
                  record?.status === "late" || record?.status === "early_leave";

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDateSelect(dateStr)}
                    className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-[oklch(0.55_0.18_250)] text-white"
                        : isToday
                          ? "bg-[oklch(0.95_0.03_250)]"
                          : "hover:bg-[oklch(0.97_0.01_250)]"
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isSelected
                          ? "font-semibold text-white"
                          : dayOfWeek === 0
                            ? "text-red-400"
                            : dayOfWeek === 6
                              ? "text-blue-400"
                              : "text-[oklch(0.30_0.02_250)]"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dotColor && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor} ${
                          isLateOrEarly ? "ring-1 ring-red-400" : ""
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* 펼치기/접기 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center w-full mt-2 py-1 text-[oklch(0.55_0.02_250)]"
      >
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/AttendanceCalendar.tsx
git commit -m "feat: 주간/월간 토글 출퇴근 캘린더 컴포넌트 추가"
```

---

## Task 8: 모바일 — AttendanceCard

**Files:**
- Create: `apps/user/components/attendance/AttendanceCard.tsx`

- [ ] **Step 1: 출퇴근 카드 컴포넌트 작성**

```typescript
// apps/user/components/attendance/AttendanceCard.tsx
"use client";

import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { AttendanceRecord } from "@/hooks/use-attendance-monthly";

dayjs.locale("ko");

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)]",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  normal: { text: "정상", color: "text-[oklch(0.45_0.12_150)]" },
  late: { text: "지각", color: "text-[oklch(0.55_0.20_25)]" },
  early_leave: { text: "조퇴", color: "text-[oklch(0.55_0.15_60)]" },
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

interface AttendanceCardProps {
  selectedDate: string;
  record: AttendanceRecord | null;
  onModifyRequest: () => void;
}

export default function AttendanceCard({
  selectedDate,
  record,
  onModifyRequest,
}: AttendanceCardProps) {
  const d = dayjs(selectedDate);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;

  if (!record) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium rounded-2xl p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-[oklch(0.25_0.02_250)]">
            {dateLabel}
          </span>
        </div>
        <p className="text-center text-sm text-[oklch(0.55_0.01_250)] py-6">
          출퇴근 기록이 없습니다
        </p>
      </motion.div>
    );
  }

  const badgeStyle =
    TYPE_BADGE_STYLES[record.attendance_type] || TYPE_BADGE_STYLES["근무"];
  const statusInfo = STATUS_LABELS[record.status] || STATUS_LABELS["normal"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium rounded-2xl p-5 mt-4"
    >
      {/* 헤더: 날짜 + 근태 유형 뱃지 */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[oklch(0.25_0.02_250)]">
          {dateLabel}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${badgeStyle}`}
        >
          {record.attendance_type}
        </span>
      </div>

      {/* 출퇴근 시간 */}
      <div className="flex items-center gap-4 mb-4 px-3 py-3 rounded-xl bg-[oklch(0.97_0.01_250)]">
        <div className="flex-1 text-center">
          <p className="text-xs text-[oklch(0.55_0.01_250)] mb-0.5">출근</p>
          <p className="text-lg font-semibold text-[oklch(0.30_0.02_250)]">
            {formatTime(record.check_in_at)}
          </p>
        </div>
        <div className="w-px h-8 bg-[oklch(0.90_0.01_250)]" />
        <div className="flex-1 text-center">
          <p className="text-xs text-[oklch(0.55_0.01_250)] mb-0.5">퇴근</p>
          <p className="text-lg font-semibold text-[oklch(0.30_0.02_250)]">
            {formatTime(record.check_out_at)}
          </p>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">출근현황</span>
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">근무시간</span>
          <span className="text-sm font-medium text-[oklch(0.30_0.02_250)]">
            {formatWorkTime(record.work_minutes)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[oklch(0.55_0.01_250)]">초과시간</span>
          <span className="text-sm font-medium text-[oklch(0.30_0.02_250)]">
            {formatWorkTime(record.overtime_minutes)}
          </span>
        </div>
      </div>

      {/* 수정 요청 상태 표시 or 버튼 */}
      {record.modification_status ? (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[oklch(0.96_0.03_60)] text-sm">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_60)]" />
          <span className="text-[oklch(0.45_0.10_60)] font-medium">
            수정 요청 {record.modification_status}
          </span>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onModifyRequest}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-[oklch(0.45_0.02_250)] bg-[oklch(0.96_0.01_250)] border border-[oklch(0.90_0.02_250)] active:bg-[oklch(0.93_0.01_250)] transition-colors"
        >
          수정 요청
        </motion.button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/AttendanceCard.tsx
git commit -m "feat: 출퇴근 카드 컴포넌트 추가"
```

---

## Task 9: 모바일 — AttendanceMobileView

**Files:**
- Create: `apps/user/components/attendance/AttendanceMobileView.tsx`

- [ ] **Step 1: 모바일 뷰 조합 컴포넌트 작성**

```typescript
// apps/user/components/attendance/AttendanceMobileView.tsx
"use client";

import { useMemo } from "react";
import AttendanceCalendar from "./AttendanceCalendar";
import AttendanceCard from "./AttendanceCard";
import MonthSelector from "./MonthSelector";
import { AttendanceRecord } from "@/hooks/use-attendance-monthly";

interface AttendanceMobileViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  records: AttendanceRecord[];
  isLoading: boolean;
  onModifyRequest: (record: AttendanceRecord) => void;
}

export default function AttendanceMobileView({
  year,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  records,
  isLoading,
  onModifyRequest,
}: AttendanceMobileViewProps) {
  const selectedRecord = useMemo(() => {
    if (!selectedDate) return null;
    return records.find((r) => r.date === selectedDate) ?? null;
  }, [selectedDate, records]);

  return (
    <div className="space-y-4">
      <MonthSelector year={year} month={month} onMonthChange={onMonthChange} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : (
        <>
          <AttendanceCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            records={records}
          />

          {selectedDate && (
            <AttendanceCard
              selectedDate={selectedDate}
              record={selectedRecord}
              onModifyRequest={() => {
                if (selectedRecord) onModifyRequest(selectedRecord);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/AttendanceMobileView.tsx
git commit -m "feat: 출퇴근 모바일 뷰 컴포넌트 추가"
```

---

## Task 10: PC — AttendanceFilter + AttendanceTable

**Files:**
- Create: `apps/user/components/attendance/AttendanceFilter.tsx`
- Create: `apps/user/components/attendance/AttendanceTable.tsx`

- [ ] **Step 1: 근태 유형 필터 컴포넌트 작성**

```typescript
// apps/user/components/attendance/AttendanceFilter.tsx
"use client";

const ATTENDANCE_TYPES = ["전체", "근무", "휴가", "재택", "외근"] as const;

interface AttendanceFilterProps {
  selected: string;
  onChange: (type: string) => void;
}

export default function AttendanceFilter({
  selected,
  onChange,
}: AttendanceFilterProps) {
  return (
    <div className="flex items-center gap-2">
      {ATTENDANCE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected === type
              ? "bg-[oklch(0.55_0.18_250)] text-white"
              : "bg-[oklch(0.96_0.01_250)] text-[oklch(0.45_0.02_250)] hover:bg-[oklch(0.93_0.01_250)]"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 테이블 컴포넌트 작성**

```typescript
// apps/user/components/attendance/AttendanceTable.tsx
"use client";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import { AttendanceRecord } from "@/hooks/use-attendance-monthly";

dayjs.locale("ko");

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  normal: { text: "정상", color: "text-[oklch(0.45_0.12_150)]" },
  late: { text: "지각", color: "text-[oklch(0.55_0.20_25)]" },
  early_leave: { text: "조퇴", color: "text-[oklch(0.55_0.15_60)]" },
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)]",
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onRowClick: (record: AttendanceRecord) => void;
}

export default function AttendanceTable({
  records,
  onRowClick,
}: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[oklch(0.55_0.01_250)]">
        출퇴근 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="card-premium rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[oklch(0.92_0.01_250)]">
            <th className="text-left py-3 px-4 font-medium text-[oklch(0.50_0.01_250)]">
              날짜
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              요일
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              출근
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              퇴근
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              근태
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              현황
            </th>
            <th className="text-left py-3 px-2 font-medium text-[oklch(0.50_0.01_250)]">
              근무
            </th>
            <th className="text-right py-3 px-4 font-medium text-[oklch(0.50_0.01_250)]">
              초과
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const d = dayjs(record.date);
            const dayOfWeek = d.day();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const statusInfo =
              STATUS_LABELS[record.status] || STATUS_LABELS["normal"];
            const badgeStyle =
              TYPE_BADGE_STYLES[record.attendance_type] ||
              TYPE_BADGE_STYLES["근무"];

            return (
              <tr
                key={record.id}
                onClick={() => onRowClick(record)}
                className={`border-b border-[oklch(0.95_0.01_250)] cursor-pointer hover:bg-[oklch(0.97_0.01_250)] transition-colors ${
                  isWeekend ? "bg-[oklch(0.98_0.005_250)]" : ""
                }`}
              >
                <td className="py-3 px-4 text-[oklch(0.30_0.02_250)]">
                  <div className="flex items-center gap-1.5">
                    {record.modification_status && (
                      <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.15_60)] shrink-0" />
                    )}
                    {d.format("MM-DD")}
                  </div>
                </td>
                <td
                  className={`py-3 px-2 ${
                    dayOfWeek === 0
                      ? "text-red-400"
                      : dayOfWeek === 6
                        ? "text-blue-400"
                        : "text-[oklch(0.45_0.02_250)]"
                  }`}
                >
                  {d.format("dd")}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatTime(record.check_in_at)}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatTime(record.check_out_at)}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeStyle}`}
                  >
                    {record.attendance_type}
                  </span>
                </td>
                <td className={`py-3 px-2 font-medium ${statusInfo.color}`}>
                  {statusInfo.text}
                </td>
                <td className="py-3 px-2 text-[oklch(0.30_0.02_250)]">
                  {formatWorkTime(record.work_minutes)}
                </td>
                <td className="py-3 px-4 text-right text-[oklch(0.30_0.02_250)]">
                  {formatWorkTime(record.overtime_minutes)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/components/attendance/AttendanceFilter.tsx apps/user/components/attendance/AttendanceTable.tsx
git commit -m "feat: 출퇴근 필터 및 테이블 컴포넌트 추가"
```

---

## Task 11: PC — AttendanceDesktopView

**Files:**
- Create: `apps/user/components/attendance/AttendanceDesktopView.tsx`

- [ ] **Step 1: PC 뷰 조합 컴포넌트 작성**

```typescript
// apps/user/components/attendance/AttendanceDesktopView.tsx
"use client";

import { useState, useMemo } from "react";
import MonthSelector from "./MonthSelector";
import AttendanceFilter from "./AttendanceFilter";
import AttendanceTable from "./AttendanceTable";
import {
  AttendanceRecord,
  AttendanceSummary,
} from "@/hooks/use-attendance-monthly";

interface AttendanceDesktopViewProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  records: AttendanceRecord[];
  summary: AttendanceSummary | null;
  isLoading: boolean;
  onRowClick: (record: AttendanceRecord) => void;
}

export default function AttendanceDesktopView({
  year,
  month,
  onMonthChange,
  records,
  summary,
  isLoading,
  onRowClick,
}: AttendanceDesktopViewProps) {
  const [filterType, setFilterType] = useState("전체");

  const filteredRecords = useMemo(() => {
    if (filterType === "전체") return records;
    return records.filter((r) => r.attendance_type === filterType);
  }, [records, filterType]);

  return (
    <div className="space-y-5">
      {/* 헤더: 월 선택 + 필터 */}
      <div className="flex items-center justify-between">
        <MonthSelector year={year} month={month} onMonthChange={onMonthChange} />
        <AttendanceFilter selected={filterType} onChange={setFilterType} />
      </div>

      {/* 서머리 카드 */}
      {summary && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "근무일", value: `${summary.total_work_days}일` },
            {
              label: "총 근무",
              value: `${Math.floor(summary.total_work_minutes / 60)}h`,
            },
            {
              label: "초과근무",
              value:
                summary.total_overtime_minutes > 0
                  ? `${Math.floor(summary.total_overtime_minutes / 60)}h ${summary.total_overtime_minutes % 60}m`
                  : "-",
            },
            { label: "지각", value: `${summary.late_count}회` },
            { label: "조퇴", value: `${summary.early_leave_count}회` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="card-premium rounded-xl p-4 text-center"
            >
              <p className="text-xs text-[oklch(0.55_0.01_250)] mb-1">
                {label}
              </p>
              <p className="text-lg font-semibold text-[oklch(0.25_0.02_250)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        </div>
      ) : (
        <AttendanceTable records={filteredRecords} onRowClick={onRowClick} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/AttendanceDesktopView.tsx
git commit -m "feat: 출퇴근 PC 데스크톱 뷰 컴포넌트 추가"
```

---

## Task 12: AttendanceModifyDrawer

**Files:**
- Create: `apps/user/components/attendance/AttendanceModifyDrawer.tsx`

- [ ] **Step 1: 근태 수정 요청 Drawer 작성**

```typescript
// apps/user/components/attendance/AttendanceModifyDrawer.tsx
"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@repo/ui/src/drawer";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import { Label } from "@repo/ui/src/label";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { AttendanceRecord } from "@/hooks/use-attendance-monthly";
import { useAttendanceModifyRequest } from "@/hooks/use-attendance-modify";

dayjs.locale("ko");

const ATTENDANCE_TYPES = ["근무", "휴가", "재택", "외근"] as const;

const TYPE_BADGE_STYLES: Record<string, string> = {
  근무: "bg-[oklch(0.93_0.04_250)] text-[oklch(0.45_0.12_250)] border-[oklch(0.85_0.08_250)]",
  휴가: "bg-[oklch(0.93_0.04_150)] text-[oklch(0.40_0.12_150)] border-[oklch(0.85_0.08_150)]",
  재택: "bg-[oklch(0.93_0.04_60)] text-[oklch(0.45_0.12_60)] border-[oklch(0.85_0.08_60)]",
  외근: "bg-[oklch(0.93_0.04_310)] text-[oklch(0.45_0.12_310)] border-[oklch(0.85_0.08_310)]",
};

interface AttendanceModifyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  memberId: string;
}

export default function AttendanceModifyDrawer({
  open,
  onOpenChange,
  record,
  memberId,
}: AttendanceModifyDrawerProps) {
  const [requestedType, setRequestedType] = useState<string>("");
  const [reason, setReason] = useState("");

  const modifyMutation = useAttendanceModifyRequest();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && record) {
      setRequestedType("");
      setReason("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!record || !requestedType || !reason.trim()) return;

    modifyMutation.mutate(
      {
        attendanceRecordId: record.id,
        requesterId: memberId,
        originalType: record.attendance_type,
        requestedType,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!record) return null;

  const d = dayjs(record.date);
  const dateLabel = `${d.format("M월 D일")} (${d.format("dd")})`;
  const isValid = !!requestedType && requestedType !== record.attendance_type && reason.trim().length > 0;

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>근태 수정 요청</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5">
          {/* 대상 날짜 */}
          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)]">
              대상 날짜
            </Label>
            <p className="mt-1 text-[oklch(0.25_0.02_250)] font-medium">
              {dateLabel}
            </p>
          </div>

          {/* 현재 근태 유형 */}
          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)]">
              현재 근태 유형
            </Label>
            <p className="mt-1">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                  TYPE_BADGE_STYLES[record.attendance_type] ||
                  TYPE_BADGE_STYLES["근무"]
                }`}
              >
                {record.attendance_type}
              </span>
            </p>
          </div>

          {/* 변경할 근태 유형 */}
          <div>
            <Label className="text-sm text-[oklch(0.50_0.01_250)] mb-2 block">
              변경할 근태 유형
            </Label>
            <div className="flex gap-2">
              {ATTENDANCE_TYPES.filter(
                (t) => t !== record.attendance_type
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setRequestedType(type)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    requestedType === type
                      ? TYPE_BADGE_STYLES[type]
                      : "bg-[oklch(0.97_0.01_250)] text-[oklch(0.50_0.01_250)] border-transparent hover:bg-[oklch(0.95_0.01_250)]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 사유 */}
          <div>
            <Label
              htmlFor="reason"
              className="text-sm text-[oklch(0.50_0.01_250)]"
            >
              사유
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="수정 사유를 입력해주세요"
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || modifyMutation.isPending}
            className="w-full bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.50_0.18_250)] text-white"
          >
            {modifyMutation.isPending ? "제출 중..." : "수정 요청"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              취소
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/user/components/attendance/AttendanceModifyDrawer.tsx
git commit -m "feat: 근태 수정 요청 Drawer 컴포넌트 추가"
```

---

## Task 13: 출퇴근 관리 페이지 (`page.tsx`)

**Files:**
- Create: `apps/user/app/(content)/attendance/page.tsx`

- [ ] **Step 1: 페이지 컴포넌트 작성**

```typescript
// apps/user/app/(content)/attendance/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useAttendanceMonthly, AttendanceRecord } from "@/hooks/use-attendance-monthly";
import AttendanceMobileView from "@/components/attendance/AttendanceMobileView";
import AttendanceDesktopView from "@/components/attendance/AttendanceDesktopView";
import AttendanceModifyDrawer from "@/components/attendance/AttendanceModifyDrawer";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function AttendancePage() {
  const router = useRouter();
  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);
  const memberId = useUserStore((s) => s.memberId);
  const setMemberInfo = useUserStore((s) => s.setMemberInfo);

  const [mounted, setMounted] = useState(false);

  const now = dayjs().tz("Asia/Seoul");
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    now.format("YYYY-MM-DD")
  );

  // Drawer 상태
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modifyTarget, setModifyTarget] = useState<AttendanceRecord | null>(null);

  // 멤버 조회
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!userName && !isLoggedIn) {
      router.push("/");
    }
  }, [router, isLoggedIn, userName, hasHydrated]);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

  // 월간 데이터
  const { data, isLoading } = useAttendanceMonthly(memberId, year, month);
  const records = data?.records ?? [];
  const summary = data?.summary ?? null;

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleModifyRequest = (record: AttendanceRecord) => {
    setModifyTarget(record);
    setDrawerOpen(true);
  };

  if (!mounted || !hasHydrated || !userName) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-xl font-bold text-[oklch(0.20_0.02_250)] mb-5">
          출퇴근 관리
        </h1>

        {/* 모바일 뷰 */}
        <div className="md:hidden">
          <AttendanceMobileView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            records={records}
            isLoading={isLoading}
            onModifyRequest={handleModifyRequest}
          />
        </div>

        {/* PC 뷰 */}
        <div className="max-md:hidden">
          <AttendanceDesktopView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            records={records}
            summary={summary}
            isLoading={isLoading}
            onRowClick={handleModifyRequest}
          />
        </div>
      </motion.div>

      {/* 수정 요청 Drawer */}
      <AttendanceModifyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={modifyTarget}
        memberId={memberId || ""}
      />
    </>
  );
}
```

- [ ] **Step 2: 수동 검증**

`pnpm dev:user`로 서버 시작 후 `/attendance` 페이지 접속:
- 모바일: 캘린더 + 카드 뷰 확인
- PC: 테이블 뷰 확인
- 수정 요청 Drawer 동작 확인

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/attendance/page.tsx
git commit -m "feat: 출퇴근 관리 페이지 추가 (모바일/PC 반응형)"
```

---

## Task 14: 전체 검증 및 타입 체크

- [ ] **Step 1: 타입 체크 실행**

```bash
pnpm check-types
```

타입 에러가 있으면 수정한다. 기존 pre-existing 에러(google-sheets, WeeklySchedule, PopoverCalendar)는 무시.

- [ ] **Step 2: 린트 실행**

```bash
pnpm lint
```

에러가 있으면 수정한다.

- [ ] **Step 3: 최종 커밋 (수정 사항이 있는 경우)**

```bash
git add -A
git commit -m "fix: 출퇴근 관리 페이지 타입/린트 오류 수정"
```
