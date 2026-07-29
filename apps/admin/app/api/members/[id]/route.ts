import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import {
  MEMBER_DETAIL_SELECT,
  assertNoSensitiveMemberFields,
} from "@/lib/privacy";
import { DEFAULT_ADMIN_ROLE } from "@/lib/rbac";
import {
  InvalidMemberBudgetFieldsError,
  normalizeMemberBudgetFields,
} from "@/lib/member-budget-fields";

const RBAC_FIELDS = ["role", "admin_role", "user_authority"];
const SENSITIVE_PII_FIELDS = ["birth_date", "phone", "passport_number"];

// GET /api/members/[id] - Get a single member with team/position info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("members:read");
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await (supabase.from("members") as any)
      .select(MEMBER_DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch member" },
        { status: 500 },
      );
    }

    assertNoSensitiveMemberFields(data as Record<string, unknown>);

    return NextResponse.json(data);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/members/[id] - Update a member (organization info, role, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();
    const changesRbacFields = RBAC_FIELDS.some(
      (field) => body[field] !== undefined,
    );
    const session = await requireAdminPermission(
      changesRbacFields ? "rbac:manage" : "members:write",
    );

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    const { data: currentMember, error: currentMemberError } = await (
      supabase.from("members") as any
    )
      .select("member_role, intern_months, position_id, positions(name)")
      .eq("id", id)
      .single();

    if (currentMemberError || !currentMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      updateData.full_name = body.full_name;
    }
    if (body.login_id !== undefined) {
      updateData.login_id = body.login_id;
    }
    if (body.password !== undefined && body.password) {
      updateData.password = body.password;
    }
    if (body.email !== undefined) {
      updateData.email = body.email || null;
    }
    if (body.birth_date !== undefined) {
      updateData.birth_date = body.birth_date || null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }
    if (body.passport_number !== undefined) {
      updateData.passport_number = body.passport_number || null;
    }
    if (body.team_id !== undefined) {
      updateData.team_id = body.team_id || null;
    }
    if (body.division_id !== undefined) {
      updateData.division_id = body.division_id || null;
    }
    if (body.organization_id !== undefined) {
      updateData.organization_id = body.organization_id || null;
    }
    if (body.note !== undefined) {
      updateData.note = body.note || null;
    }
    if (body.role !== undefined) {
      updateData.role = body.role;
    }
    if (body.admin_role !== undefined) {
      updateData.admin_role =
        body.role === "admin" ? body.admin_role || DEFAULT_ADMIN_ROLE : null;
    }
    if (body.user_authority !== undefined) {
      updateData.user_authority = body.user_authority || null;
    }
    if (body.position_id !== undefined) {
      updateData.position_id = body.position_id;
    }
    if (body.title_id !== undefined) {
      updateData.title_id = body.title_id || null;
    }

    if (
      body.member_role !== undefined ||
      body.intern_months !== undefined ||
      body.position_id !== undefined
    ) {
      let positionName = (currentMember.positions as { name: string } | null)
        ?.name;
      if (body.position_id !== undefined) {
        const { data: position, error: positionError } = await supabase
          .from("positions")
          .select("name")
          .eq("id", body.position_id)
          .single();

        if (positionError) {
          return NextResponse.json(
            { error: "올바른 직급을 선택해주세요." },
            { status: 400 },
          );
        }
        positionName = position.name;
      }

      const normalized = normalizeMemberBudgetFields(
        positionName === "인턴"
          ? "인턴"
          : (body.member_role ??
              (body.position_id !== undefined &&
              currentMember.member_role === "인턴"
                ? "팀원"
                : currentMember.member_role)),
        body.intern_months ?? currentMember.intern_months,
      );
      updateData.member_role = normalized.memberRole;
      updateData.intern_months = normalized.internMonths;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await (supabase.from("members") as any)
      .update(updateData)
      .eq("id", id)
      .select(MEMBER_DETAIL_SELECT)
      .single();

    if (error) {
      console.error("Error updating member:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Referenced team or division not found" },
          { status: 404 },
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Login ID already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update member" },
        { status: 500 },
      );
    }

    assertNoSensitiveMemberFields(data as Record<string, unknown>);

    if (changesRbacFields) {
      await writeAdminAuditLog({
        session,
        request,
        action: "member.permission_update",
        targetType: "member",
        targetId: id,
        targetLabel: data.full_name,
        riskLevel: "high",
        reason: "관리자 권한 정보 변경",
        metadata: {
          changedFields: RBAC_FIELDS.filter((field) => field in updateData),
        },
      });
    }

    const changedSensitiveFields = SENSITIVE_PII_FIELDS.filter(
      (field) => field in updateData,
    );
    if (changedSensitiveFields.length > 0) {
      await writeAdminAuditLog({
        session,
        request,
        action: "member.sensitive_update",
        targetType: "member",
        targetId: id,
        targetLabel: data.full_name,
        riskLevel: "high",
        reason: "민감정보(생년월일/연락처/여권번호) 변경",
        metadata: { changedFields: changedSensitiveFields },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Members API error:", error);
    if (error instanceof InvalidMemberBudgetFieldsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("members:write");
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 1. 해당 멤버의 usage_records에 연결된 audit_logs 먼저 삭제 (트리거 FK 충돌 방지)
    const { data: memberRecords } = await supabase
      .from("usage_records")
      .select("id")
      .eq("member_id", id);
    if (memberRecords && memberRecords.length > 0) {
      const recordIds = memberRecords.map((r) => r.id);
      await supabase
        .from("usage_record_audit_logs")
        .delete()
        .in("usage_record_id", recordIds);
    }

    // 2. cascade 없는 FK 참조를 NULL 처리
    await Promise.all([
      supabase
        .from("settlement_status")
        .update({ settled_by: null })
        .eq("settled_by", id),
      supabase
        .from("restaurants")
        .update({ created_by: null })
        .eq("created_by", id),
      supabase.from("usage_record_audit_logs").delete().eq("changed_by", id),
      supabase
        .from("usage_records")
        .update({ first_reviewed_by: null })
        .eq("first_reviewed_by", id),
      supabase
        .from("usage_records")
        .update({ last_modified_by: null })
        .eq("last_modified_by", id),
      supabase
        .from("usage_records")
        .update({ reviewed_by: null })
        .eq("reviewed_by", id),
      supabase
        .from("usage_records")
        .update({ second_reviewed_by: null })
        .eq("second_reviewed_by", id),
    ]);

    // 3. 멤버의 usage_records 직접 삭제 (CASCADE 대신, 트리거 발동 시 멤버가 아직 존재)
    await supabase.from("usage_records").delete().eq("member_id", id);

    // 4. 멤버 삭제 (나머지 테이블은 ON DELETE CASCADE로 자동 처리)
    const { error } = await supabase.from("members").delete().eq("id", id);

    if (error) {
      console.error("Error deleting member:", error);
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Members API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
