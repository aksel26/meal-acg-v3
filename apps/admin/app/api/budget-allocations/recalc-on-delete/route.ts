import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/budget-allocations/recalc-on-delete
// 멤버 삭제 + 관련 팀장/P&C팀장 활동비 재계산
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { member_id, period, intern_actual_months, manager_rate, pnc_extra_rate } = body;

    if (!member_id || !period) {
      return NextResponse.json(
        { error: "member_id and period are required" },
        { status: 400 }
      );
    }

    // 1. 삭제 대상 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, team_id, member_role, intern_months")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // 2. 인턴인 경우: intern_actual_months로 intern_months 업데이트
    if (member.member_role === "인턴" && intern_actual_months !== undefined) {
      const { error: updateError } = await supabase
        .from("members")
        .update({ intern_months: intern_actual_months })
        .eq("id", member_id);

      if (updateError) {
        console.error("Error updating intern_months:", updateError);
        return NextResponse.json(
          { error: "Failed to update intern_months" },
          { status: 500 }
        );
      }
    }

    // 3. 해당 팀의 팀장(member_role='팀장' 또는 '본부장') 찾기
    let leaderId: string | null = null;
    if (member.team_id) {
      const { data: leader } = await supabase
        .from("members")
        .select("id")
        .eq("team_id", member.team_id)
        .in("member_role", ["대표", "팀장", "본부장"])
        .neq("id", member_id)
        .limit(1)
        .single();

      leaderId = leader?.id ?? null;
    }

    // 4. P&C팀장 식별 (team name에 'P&C' 또는 'People & Culture' 포함)
    let pncLeaderId: string | null = null;
    const { data: pncTeams } = await supabase
      .from("teams")
      .select("id")
      .or("name.ilike.%P&C%,name.ilike.%People & Culture%");

    if (pncTeams && pncTeams.length > 0) {
      const pncTeamIds = pncTeams.map((t) => t.id);
      const { data: pncLeader } = await supabase
        .from("members")
        .select("id")
        .in("team_id", pncTeamIds)
        .in("member_role", ["대표", "팀장", "본부장"])
        .limit(1)
        .single();

      pncLeaderId = pncLeader?.id ?? null;
    }

    // 5. 멤버 삭제 (기존 DELETE /api/members/[id] 로직 재사용)
    // 5-1. 해당 멤버의 usage_records에 연결된 audit_logs 먼저 삭제
    const { data: memberRecords } = await supabase
      .from("usage_records")
      .select("id")
      .eq("member_id", member_id);

    if (memberRecords && memberRecords.length > 0) {
      const recordIds = memberRecords.map((r) => r.id);
      await supabase
        .from("usage_record_audit_logs")
        .delete()
        .in("usage_record_id", recordIds);
    }

    // 5-2. cascade 없는 FK 참조를 NULL 처리
    await Promise.all([
      supabase.from("settlement_status").update({ settled_by: null }).eq("settled_by", member_id),
      supabase.from("restaurants").update({ created_by: null }).eq("created_by", member_id),
      supabase.from("usage_record_audit_logs").delete().eq("changed_by", member_id),
      supabase.from("usage_records").update({ first_reviewed_by: null }).eq("first_reviewed_by", member_id),
      supabase.from("usage_records").update({ last_modified_by: null }).eq("last_modified_by", member_id),
      supabase.from("usage_records").update({ reviewed_by: null }).eq("reviewed_by", member_id),
      supabase.from("usage_records").update({ second_reviewed_by: null }).eq("second_reviewed_by", member_id),
    ]);

    // 5-3. 멤버의 usage_records 직접 삭제
    await supabase.from("usage_records").delete().eq("member_id", member_id);

    // 5-4. 멤버 삭제
    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", member_id);

    if (deleteError) {
      console.error("Error deleting member:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete member" },
        { status: 500 }
      );
    }

    // 6. 팀장 활동비 재계산 (삭제 후 RPC 호출 → 정확한 팀원 수 반영)
    const recalcResults: {
      leader_id: string;
      role: string;
      new_amount: number;
    }[] = [];

    if (leaderId) {
      const rpcParams: Record<string, unknown> = { p_member_id: leaderId };
      if (manager_rate !== undefined) {
        rpcParams.p_per_member_amount = manager_rate;
      }

      const { data: newAmount, error: rpcError } = await supabase.rpc(
        "calculate_activity_budget",
        rpcParams
      );

      if (rpcError) {
        console.error("Error calculating leader budget:", rpcError);
      } else if (newAmount !== null) {
        // budget_allocations upsert (member_id + type + period)
        await upsertBudgetAllocation(supabase, leaderId, period, newAmount);
        recalcResults.push({
          leader_id: leaderId,
          role: "team_leader",
          new_amount: newAmount,
        });
      }
    }

    // 7. P&C팀장이 팀장과 다른 경우에만 P&C팀장 활동비도 재계산
    if (pncLeaderId && pncLeaderId !== leaderId) {
      const rpcParams: Record<string, unknown> = { p_member_id: pncLeaderId };
      if (pnc_extra_rate !== undefined) {
        rpcParams.p_additional_per_amount = pnc_extra_rate;
      }

      const { data: newAmount, error: rpcError } = await supabase.rpc(
        "calculate_activity_budget",
        rpcParams
      );

      if (rpcError) {
        console.error("Error calculating P&C leader budget:", rpcError);
      } else if (newAmount !== null) {
        await upsertBudgetAllocation(supabase, pncLeaderId, period, newAmount);
        recalcResults.push({
          leader_id: pncLeaderId,
          role: "pnc_leader",
          new_amount: newAmount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted_member: {
        id: member.id,
        full_name: member.full_name,
        team_id: member.team_id,
        member_role: member.member_role,
      },
      recalculated: recalcResults,
    });
  } catch (error) {
    console.error("Recalc-on-delete API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// budget_allocations upsert: 기존 레코드가 있으면 update, 없으면 insert
async function upsertBudgetAllocation(
  supabase: ReturnType<typeof createServiceClient>,
  memberId: string,
  period: string,
  totalAmount: number
) {
  const { data: existing } = await supabase
    .from("budget_allocations")
    .select("id")
    .eq("member_id", memberId)
    .eq("type", "활동비")
    .eq("period", period)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("budget_allocations")
      .update({ total_amount: totalAmount })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating budget allocation:", error);
    }
  } else {
    const { error } = await supabase
      .from("budget_allocations")
      .insert({
        member_id: memberId,
        type: "활동비" as const,
        period,
        total_amount: totalAmount,
      });

    if (error) {
      console.error("Error inserting budget allocation:", error);
    }
  }
}
