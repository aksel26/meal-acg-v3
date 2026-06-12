import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

type ProjectOverviewRow = {
  id: string;
  title: string;
  status: string;
  owner_id: string | null;
  manager_ids: string[] | null;
  stakeholder_ids: string[] | null;
  customer_names: string[] | null;
  start_date: string | null;
  due_date: string | null;
};

function monthRange(year: number, month: number) {
  const padded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${padded}-01`,
    end: `${year}-${padded}-${String(lastDay).padStart(2, "0")}`,
  };
}

function leaveDeductionAmount(row: { leave_type?: unknown }) {
  const leaveType = Array.isArray(row.leave_type)
    ? row.leave_type[0]
    : row.leave_type;

  if (leaveType && typeof leaveType === "object" && "deduction_amount" in leaveType) {
    const amount = Number((leaveType as { deduction_amount?: unknown }).deduction_amount ?? 0);
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

function createWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "work" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function projectRole(project: ProjectOverviewRow, memberId: string) {
  if (project.owner_id === memberId) return "오너";
  if (project.manager_ids?.includes(memberId)) return "담당자";
  if (project.stakeholder_ids?.includes(memberId)) return "이해관계자";
  return "참여";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:read");
    const supabase = createServiceClient();
    const { id } = await params;

    // PostgREST .or() 필터에 raw 보간되므로 UUID 형식을 강제해 필터 인젝션을 막는다.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const range = monthRange(year, month);

    const [
      canLeave,
      canAttendance,
      canSensitive,
      canSensitiveWrite,
      canSalary,
      canSalaryWrite,
    ] = await Promise.all([
      hasEffectiveAdminPermission(session, "leave:read"),
      hasEffectiveAdminPermission(session, "attendance:read"),
      hasEffectiveAdminPermission(session, "members:sensitive:read"),
      hasEffectiveAdminPermission(session, "members:sensitive:write"),
      hasEffectiveAdminPermission(session, "members:salary:read"),
      hasEffectiveAdminPermission(session, "members:salary:write"),
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

    const workClient = createWorkClient();
    const [leaveResult, attendanceResult, projectsResult] = await Promise.all([
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
      workClient
        .from("projects")
        .select(
          "id,title,status,owner_id,manager_ids,stakeholder_ids,customer_names,start_date,due_date",
        )
        .or(
          `owner_id.eq.${id},manager_ids.cs.{${id}},stakeholder_ids.cs.{${id}}`,
        )
        .order("created_at", { ascending: false }),
    ]);

    if (leaveResult.error || attendanceResult.error || projectsResult.error) {
      return NextResponse.json(
        { error: "Failed to fetch member overview" },
        { status: 500 },
      );
    }

    const leaveRows = leaveResult.data || [];
    const attendanceRows = attendanceResult.data || [];
    const approvedLeaveRows = leaveRows.filter(isApprovedLeave);
    const pendingLeaveRows = leaveRows.filter(isPendingLeave);
    const projects = ((projectsResult.data || []) as ProjectOverviewRow[]).map(
      (project) => ({
        id: project.id,
        title: project.title,
        status: project.status,
        role: projectRole(project, id),
        customerNames: project.customer_names || [],
        startDate: project.start_date,
        dueDate: project.due_date,
      }),
    );

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
      projects,
      permissions: {
        leave: canLeave,
        attendance: canAttendance,
        sensitive: canSensitive,
        sensitiveWrite: canSensitiveWrite,
        salary: canSalary,
        salaryWrite: canSalaryWrite,
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
