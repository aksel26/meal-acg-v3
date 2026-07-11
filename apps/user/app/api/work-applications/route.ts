import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

type ApplicationType = "overtime" | "weekend";
type ApplicationStatus = "pending" | "approved" | "rejected";

type MemberScopeRow = {
  id: string;
  full_name: string;
  member_role: string | null;
  user_authority: string | null;
  team_id: string | null;
  division_id: string | null;
  organization_id: string | null;
  team?: { division_id: string | null } | null;
};

const APPROVER_ROLES = new Set(["대표", "본부장", "팀장", "파트장"]);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isApplicationType(value: string | null): value is ApplicationType {
  return value === "overtime" || value === "weekend";
}

function isStatus(value: string | null): value is ApplicationStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function getEffectiveDivisionId(member: MemberScopeRow) {
  return member.division_id || member.team?.division_id || null;
}

function canManageMembers(member: MemberScopeRow) {
  return (
    member.user_authority === "팀장" ||
    member.user_authority === "팀장/본부장" ||
    member.member_role === "팀장" ||
    member.member_role === "본부장" ||
    member.member_role === "대표"
  );
}

async function getManagedMemberIds(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  memberId: string,
) {
  const { data: currentMember, error } = await supabase
    .from("members")
    .select("id, full_name, member_role, user_authority, team_id, division_id, organization_id, team:teams!members_team_id_fkey(division_id)")
    .eq("id", memberId)
    .single();

  if (error || !currentMember) return [];

  const current = currentMember as MemberScopeRow;
  if (!canManageMembers(current)) return [];

  let query = supabase
    .from("members")
    .select("id, member_role, user_authority, team_id, division_id, organization_id, team:teams!members_team_id_fkey(division_id)")
    .neq("id", memberId);

  if (current.organization_id) {
    query = query.eq("organization_id", current.organization_id);
  }

  const { data: members } = await query;
  const rows = (members || []) as MemberScopeRow[];

  if (current.member_role === "대표") {
    return rows.map((member) => member.id);
  }

  if (current.user_authority === "팀장/본부장" || current.member_role === "본부장") {
    const divisionId = getEffectiveDivisionId(current);
    if (!divisionId) return [];
    return rows
      .filter((member) => getEffectiveDivisionId(member) === divisionId)
      .map((member) => member.id);
  }

  if (!current.team_id) return [];
  return rows
    .filter((member) => member.team_id === current.team_id)
    .map((member) => member.id);
}

async function attachApprovalIds(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  applications: Record<string, unknown>[],
) {
  const ids = applications.map((application) => application.id).filter(Boolean) as string[];
  if (ids.length === 0) return applications;

  const { data: approvals } = await supabase
    .from("approval_requests")
    .select("id, related_id")
    .eq("related_table", "work_applications")
    .in("related_id", ids);

  const approvalByRelatedId = new Map(
    (approvals || []).map((approval) => [approval.related_id, approval.id]),
  );

  return applications.map((application) => ({
    ...application,
    approval_id: approvalByRelatedId.get(application.id as string) || null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope") || "mine";
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // 조회 기준 멤버는 세션에서 강제 (managed 스코프도 세션 사용자 기준으로 산출)
    const memberId = sessionUser.id;

    let requesterIds = [memberId];

    if (scope === "managed") {
      requesterIds = await getManagedMemberIds(supabase, memberId);
      if (requesterIds.length === 0) return NextResponse.json([]);
    }

    let query = supabase
      .from("work_applications")
      .select(`
        *,
        requester:members!work_applications_requester_id_fkey(id, full_name, member_role, team_id, division_id, team:teams!members_team_id_fkey(name, division_id)),
        approver:members!work_applications_approver_id_fkey(id, full_name)
      `)
      .in("requester_id", requesterIds)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (isStatus(status)) query = query.eq("status", status);
    if (isApplicationType(type)) query = query.eq("application_type", type);

    const { data, error } = await query;
    if (error) {
      console.error("Work applications fetch error:", error);
      return NextResponse.json({ error: "근무 신청 조회 실패" }, { status: 500 });
    }

    const result = await attachApprovalIds(supabase, (data || []) as Record<string, unknown>[]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Work applications API error:", error);
    return NextResponse.json({ error: "근무 신청 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    const body = await request.json();
    // 신청자는 세션에서 강제 (body 값 신뢰하지 않음), 승인자는 body 값 유지
    const requesterId = sessionUser.id;
    const applicationType = normalizeText(body.applicationType);
    const workDate = normalizeText(body.workDate);
    const startTime = normalizeText(body.startTime);
    const endTime = normalizeText(body.endTime);
    const projectName = normalizeText(body.projectName);
    const reason = normalizeText(body.reason);
    const selectedApproverId = normalizeText(body.approverId);

    if (!requesterId || !isApplicationType(applicationType)) {
      return NextResponse.json({ error: "신청자와 신청 유형이 필요합니다." }, { status: 400 });
    }

    if (!workDate || !startTime || !endTime || !projectName || !reason) {
      return NextResponse.json(
        { error: "근무일, 시작시간, 종료시간, 프로젝트/업무명, 사유를 모두 입력해주세요." },
        { status: 400 },
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: "종료시간은 시작시간보다 늦어야 합니다." }, { status: 400 });
    }

    let approverId = selectedApproverId;

    if (approverId) {
      const { data: approver, error: approverFetchError } = await supabase
        .from("members")
        .select("id, member_role")
        .eq("id", approverId)
        .single();

      if (
        approverFetchError ||
        !approver ||
        approver.id === requesterId ||
        !APPROVER_ROLES.has(approver.member_role || "")
      ) {
        return NextResponse.json(
          { error: "선택한 승인자를 확인할 수 없습니다. 팀장급 이상만 선택할 수 있습니다." },
          { status: 400 },
        );
      }
    } else {
      const { data: autoApproverId, error: approverError } = await supabase.rpc(
        "get_approver_for_member",
        { p_member_id: requesterId },
      );

      if (approverError || !autoApproverId || autoApproverId === requesterId) {
        return NextResponse.json(
          { error: "상위 승인자를 찾을 수 없습니다. 조직/직책 정보를 확인해주세요." },
          { status: 400 },
        );
      }

      approverId = autoApproverId;
    }

    const { data: application, error: applicationError } = await supabase
      .from("work_applications")
      .insert({
        requester_id: requesterId,
        application_type: applicationType,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        project_name: projectName,
        reason,
        approver_id: approverId,
      })
      .select()
      .single();

    if (applicationError || !application) {
      console.error("Work application create error:", applicationError);
      return NextResponse.json({ error: "근무 신청 등록 실패" }, { status: 500 });
    }

    const { error: approvalError } = await supabase.from("approval_requests").insert({
      type: "overtime",
      requester_id: requesterId,
      approver_id: approverId,
      status: "pending",
      related_table: "work_applications",
      related_id: application.id,
    });

    if (approvalError) {
      console.error("Work application approval create error:", approvalError);
      await supabase.from("work_applications").delete().eq("id", application.id);
      return NextResponse.json({ error: "승인 요청 생성 실패" }, { status: 500 });
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("Work application create API error:", error);
    return NextResponse.json({ error: "근무 신청 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
