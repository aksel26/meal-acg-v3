import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { hasEffectiveAdminPermission } from "@/lib/rbac-server";
import { createServiceClient } from "@/lib/supabase/server";

type PermissionResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type LeaveOverviewRow = {
  approval_status?: string | null;
  approver_id?: string | null;
  approved_at?: string | null;
  leave_type?: unknown;
};

function currentPeriod(now = new Date()) {
  const year = now.getFullYear();
  const half = now.getMonth() + 1 <= 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function monthRange(year: number, month: number) {
  const padded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${padded}-01`,
    end: `${year}-${padded}-${String(lastDay).padStart(2, "0")}`,
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function leaveDeductionAmount(row: { leave_type?: unknown }) {
  const leaveType = Array.isArray(row.leave_type)
    ? row.leave_type[0]
    : row.leave_type;

  if (leaveType && typeof leaveType === "object" && "deduction_amount" in leaveType) {
    const amount = toNumber((leaveType as { deduction_amount?: unknown }).deduction_amount);
    return amount > 0 ? amount : 1;
  }

  return 1;
}

function isApprovedLeave(row: LeaveOverviewRow) {
  if (row.approval_status) {
    return row.approval_status === "approved";
  }

  return Boolean(row.approver_id || row.approved_at);
}

function isPendingLeave(row: LeaveOverviewRow) {
  if (row.approval_status) {
    return row.approval_status === "pending" ||
      row.approval_status === "pre_approved";
  }

  return !row.approver_id && !row.approved_at;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:read");
    const supabase = createServiceClient();
    const { id } = await params;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const range = monthRange(year, month);
    const period = currentPeriod(now);

    const [canLeave, canAttendance, canPoints, canMeal, canSensitive] =
      await Promise.all([
        hasEffectiveAdminPermission(session, "leave:read"),
        hasEffectiveAdminPermission(session, "attendance:read"),
        hasEffectiveAdminPermission(session, "points:read"),
        hasEffectiveAdminPermission(session, "meal:read"),
        hasEffectiveAdminPermission(session, "members:sensitive:read"),
      ]);

    const { data: statusRow, error: statusError } = await supabase
      .from("member_current_status")
      .select("current_status,status_start_date,status_end_date,status_note")
      .eq("member_id", id)
      .single();

    if (statusError && statusError.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch current status" },
        { status: 500 },
      );
    }

    const [leaveResult, attendanceResult, pointsResult] = await Promise.all([
      canLeave
        ? supabase
            .from("dayoffs")
            .select(
              "id, approval_status, approver_id, approved_at, leave_type:leave_types(deduction_amount)",
            )
            .eq("target_id", id)
            .eq("is_deleted", false)
            .gte("leave_date", `${year}-01-01`)
            .lte("leave_date", `${year}-12-31`)
        : Promise.resolve({ data: null, error: null } as PermissionResult<never>),
      canAttendance
        ? supabase
            .from("attendance_records")
            .select("id, status, check_in_at")
            .eq("member_id", id)
            .gte("date", range.start)
            .lte("date", range.end)
        : Promise.resolve({ data: null, error: null } as PermissionResult<never>),
      canPoints || canMeal
        ? supabase
            .from("budget_summary")
            .select("type,total_amount,used_amount,remaining_amount")
            .eq("member_id", id)
            .eq("period", period)
        : Promise.resolve({ data: null, error: null } as PermissionResult<never>),
    ]);

    if (leaveResult.error || attendanceResult.error || pointsResult.error) {
      return NextResponse.json(
        { error: "Failed to fetch member overview" },
        { status: 500 },
      );
    }

    const leaveRows = leaveResult.data || [];
    const attendanceRows = attendanceResult.data || [];
    const pointRows = pointsResult.data || [];
    const activity = pointRows.find((row) => row.type === "활동비");
    const welfare = pointRows.find((row) => row.type === "복지포인트");
    const approvedLeaveRows = leaveRows.filter(isApprovedLeave);
    const pendingLeaveRows = leaveRows.filter(isPendingLeave);

    return NextResponse.json({
      currentStatus: {
        status: statusRow?.current_status ?? null,
        startDate: statusRow?.status_start_date ?? null,
        endDate: statusRow?.status_end_date ?? null,
        note: statusRow?.status_note ?? null,
      },
      leave: canLeave
        ? {
            year,
            usedDays: approvedLeaveRows.reduce(
              (sum, row) => sum + leaveDeductionAmount(row),
              0,
            ),
            approvedCount: approvedLeaveRows.length,
            pendingCount: pendingLeaveRows.length,
          }
        : null,
      attendance: canAttendance
        ? {
            year,
            month,
            checkedInDays: attendanceRows.filter((row) => row.check_in_at).length,
            lateCount: attendanceRows.filter((row) => row.status === "late").length,
            absentCount: attendanceRows.filter((row) => row.status === "absent").length,
          }
        : null,
      points:
        canPoints || canMeal
          ? {
              period,
              mealUsed: canMeal ? toNumber(activity?.used_amount) : 0,
              welfareUsed: canPoints ? toNumber(welfare?.used_amount) : 0,
              mealBudget: canMeal ? toNumber(activity?.total_amount) : 0,
              welfareBudget: canPoints ? toNumber(welfare?.total_amount) : 0,
            }
          : null,
      permissions: {
        leave: canLeave,
        attendance: canAttendance,
        points: canPoints,
        meal: canMeal,
        sensitive: canSensitive,
      },
    });
  } catch (error) {
    console.error("Member overview API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
