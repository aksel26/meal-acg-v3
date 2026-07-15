import "server-only";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

const OPEN_ATTENDANCE_WINDOW_MS = 18 * 60 * 60 * 1000;

export class AttendanceActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const RPC_ERRORS: Record<string, { message: string; status: number }> = {
  ATTENDANCE_OPEN_RECORD_EXISTS: {
    message: "미퇴근 기록이 있습니다. 먼저 퇴근 처리해 주세요.",
    status: 409,
  },
  ATTENDANCE_ALREADY_CHECKED_IN: {
    message: "이미 출근 처리되었습니다.",
    status: 409,
  },
  ATTENDANCE_OPEN_RECORD_NOT_FOUND: {
    message: "18시간 이내의 미퇴근 기록이 없습니다.",
    status: 400,
  },
  ATTENDANCE_ALREADY_CHECKED_OUT: {
    message: "이미 퇴근 처리되었습니다.",
    status: 409,
  },
  ATTENDANCE_EARLY_LEAVE_REASON_REQUIRED: {
    message: "조기퇴근 사유를 입력해 주세요.",
    status: 400,
  },
};

async function getAttendanceContext() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AttendanceActionError("로그인이 필요합니다.", 401);
  }

  const supabase = createServiceClient();
  if (!supabase) {
    throw new AttendanceActionError("데이터베이스 연결 오류", 500);
  }

  return { memberId: sessionUser.id, supabase };
}

function throwRpcError(error: { message: string }) {
  const knownError = RPC_ERRORS[error.message];
  if (knownError) {
    throw new AttendanceActionError(knownError.message, knownError.status);
  }

  console.error("Attendance persistence error:", error);
  throw new AttendanceActionError("출퇴근 처리에 실패했습니다.", 500);
}

export async function getAttendanceForDate(
  date: string,
  includeRecentOpenRecord = false,
) {
  const { memberId, supabase } = await getAttendanceContext();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("member_id", memberId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("Attendance lookup error:", error);
    throw new AttendanceActionError("출퇴근 기록 조회 실패", 500);
  }

  if (data || !includeRecentOpenRecord) return data;

  const { data: openRecord, error: openRecordError } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("member_id", memberId)
    .is("check_out_at", null)
    .not("check_in_at", "is", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openRecordError) {
    console.error("Open attendance lookup error:", openRecordError);
    throw new AttendanceActionError("출퇴근 기록 조회 실패", 500);
  }

  if (!openRecord?.check_in_at) return null;

  const elapsedMs = Date.now() - new Date(openRecord.check_in_at).getTime();
  return elapsedMs >= 0 && elapsedMs <= OPEN_ATTENDANCE_WINDOW_MS
    ? openRecord
    : null;
}

export async function recordCheckIn() {
  const { memberId, supabase } = await getAttendanceContext();
  const { data, error } = await supabase
    .rpc("record_attendance_check_in", { p_member_id: memberId })
    .single();

  if (error) throwRpcError(error);
  return data;
}

export async function recordCheckOut(earlyLeaveReason?: string) {
  const { memberId, supabase } = await getAttendanceContext();
  const { data, error } = await supabase
    .rpc("record_attendance_check_out", {
      p_member_id: memberId,
      p_early_leave_reason: earlyLeaveReason?.trim() || undefined,
    })
    .single();

  if (error) throwRpcError(error);
  return data;
}
