import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface ImportRecord {
  name: string;
  type: "활동비" | "복지포인트";
  description: string;
  amount: number;
  used_at: string;
  notes: string | null;
  pnc_check: string | null;
  no: number | null;
}

interface ImportRequest {
  records: ImportRecord[];
  admin_id: string;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  failed: number;
  errors: string[];
  summary: string[];
}

function getPeriodFromDate(dateStr: string): string {
  const month = parseInt(dateStr.slice(5, 7), 10);
  const year = dateStr.slice(0, 4);
  return month <= 6 ? `${year}-H1` : `${year}-H2`;
}

export async function POST(request: Request): Promise<NextResponse<ImportResult>> {
  try {
    await requireAdminPermission("points:write");
    const body: ImportRequest = await request.json();
    const { records, admin_id } = body;

    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, inserted: 0, failed: 0, errors: ["레코드가 없습니다."], summary: [] },
        { status: 400 }
      );
    }

    if (!admin_id) {
      return NextResponse.json(
        { success: false, inserted: 0, failed: 0, errors: ["관리자 ID가 필요합니다."], summary: [] },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. 전체 멤버 조회 → NFC 정규화 이름 매핑
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, full_name");

    if (membersError || !members) {
      return NextResponse.json(
        { success: false, inserted: 0, failed: 0, errors: ["멤버 목록 조회 실패"], summary: [] },
        { status: 500 }
      );
    }

    const nameToMemberId = new Map<string, string>();
    for (const m of members) {
      nameToMemberId.set(m.full_name.normalize("NFC"), m.id);
      nameToMemberId.set(m.full_name.normalize("NFC").replace(/\s/g, ""), m.id);
    }

    // 2. 레코드별 member_id 매핑 + period 계산
    const errors: string[] = [];
    const validRecords: {
      member_id: string;
      name: string;
      type: "활동비" | "복지포인트";
      description: string;
      amount: number;
      used_at: string;
      notes: string | null;
      pnc_check: string | null;
      no: number | null;
      period: string;
    }[] = [];

    for (const record of records) {
      const normalizedName = record.name.normalize("NFC");
      const memberId = nameToMemberId.get(normalizedName) || nameToMemberId.get(normalizedName.replace(/\s/g, ""));

      if (!memberId) {
        errors.push(`"${record.name}"님을 찾을 수 없습니다.`);
        continue;
      }

      const period = getPeriodFromDate(record.used_at);
      validRecords.push({
        member_id: memberId,
        name: record.name,
        type: record.type,
        description: record.description,
        amount: record.amount,
        used_at: record.used_at,
        notes: record.notes,
        pnc_check: record.pnc_check,
        no: record.no ?? null,
        period,
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json({
        success: false,
        inserted: 0,
        failed: records.length,
        errors,
        summary: [],
      });
    }

    // 3. 고유 (member_id, period, type) 조합으로 allocation 조회
    const allocationKeys = new Set<string>();
    for (const r of validRecords) {
      allocationKeys.add(`${r.member_id}|${r.period}|${r.type}`);
    }

    const uniquePeriods = [...new Set(validRecords.map((r) => r.period))];
    const uniqueMemberIds = [...new Set(validRecords.map((r) => r.member_id))];

    const { data: allocations, error: allocError } = await supabase
      .from("budget_allocations")
      .select("id, member_id, period, type")
      .in("period", uniquePeriods)
      .in("member_id", uniqueMemberIds);

    if (allocError) {
      return NextResponse.json(
        { success: false, inserted: 0, failed: records.length, errors: [`배정 조회 실패: ${allocError.message}`], summary: [] },
        { status: 500 }
      );
    }

    // allocation 매핑
    const allocationMap = new Map<string, string>();
    for (const a of allocations || []) {
      allocationMap.set(`${a.member_id}|${a.period}|${a.type}`, a.id);
    }

    // 4. allocation_id 매핑
    const toInsert: {
      member_id: string;
      allocation_id: string;
      type: "활동비" | "복지포인트";
      description: string;
      amount: number;
      used_at: string;
      notes: string | null;
      no?: number | null;
      review_status: number;
      is_reviewed?: boolean;
      reviewed_at?: string;
      reviewed_by?: string;
      first_reviewed_at?: string;
      first_reviewed_by?: string;
      second_reviewed_at?: string;
      second_reviewed_by?: string;
    }[] = [];

    for (const r of validRecords) {
      const key = `${r.member_id}|${r.period}|${r.type}`;
      const allocationId = allocationMap.get(key);

      if (!allocationId) {
        const halfLabel = r.period.split("-")[1];
        errors.push(`${r.name}님의 ${r.period.split("-")[0]}년 ${halfLabel === "H1" ? "상반기" : "하반기"} ${r.type} 배정이 없습니다.`);
        continue;
      }

      // P&C확인 날짜가 있으면 최종확인(review_status: 2)으로 설정
      if (r.pnc_check) {
        const reviewedAt = r.pnc_check.replace(/\./g, "-"); // "2026.02.02" → "2026-02-02"
        toInsert.push({
          member_id: r.member_id,
          allocation_id: allocationId,
          type: r.type,
          description: r.description,
          amount: r.amount,
          used_at: r.used_at,
          notes: r.notes,
          no: r.no ?? null,
          review_status: 2,
          is_reviewed: true,
          reviewed_at: reviewedAt,
          reviewed_by: admin_id,
          first_reviewed_at: reviewedAt,
          first_reviewed_by: admin_id,
          second_reviewed_at: reviewedAt,
          second_reviewed_by: admin_id,
        });
      } else {
        toInsert.push({
          member_id: r.member_id,
          allocation_id: allocationId,
          type: r.type,
          description: r.description,
          amount: r.amount,
          used_at: r.used_at,
          notes: r.notes,
          no: r.no ?? null,
          review_status: 0,
        });
      }
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: false,
        inserted: 0,
        failed: records.length,
        errors,
        summary: [],
      });
    }

    // 5. 엑셀 내 중복 제거: 아래 행(나중 인덱스)이 우선
    const dedupeMap = new Map<string, (typeof toInsert)[0]>();
    for (const record of toInsert) {
      const dedupeKey = `${record.member_id}|${record.used_at}|${record.type}|${record.description}`;
      dedupeMap.set(dedupeKey, record);
    }
    const finalInsert = [...dedupeMap.values()];

    // 6. 기존 DB 레코드 삭제 (덮어쓰기)
    for (const r of finalInsert) {
      await supabase
        .from("usage_records")
        .delete()
        .eq("member_id", r.member_id)
        .eq("used_at", r.used_at)
        .eq("type", r.type)
        .eq("description", r.description);
    }

    // 7. batch insert usage_records
    const { data: insertedRecords, error: insertError } = await supabase
      .from("usage_records")
      .insert(finalInsert)
      .select("id");

    if (insertError) {
      return NextResponse.json(
        { success: false, inserted: 0, failed: finalInsert.length, errors: [...errors, `등록 실패: ${insertError.message}`], summary: [] },
        { status: 500 }
      );
    }

    // 8. audit log batch insert
    if (insertedRecords && insertedRecords.length > 0) {
      const auditLogs = insertedRecords.map((rec, idx) => {
        const src = finalInsert[idx];
        return {
          usage_record_id: rec.id,
          action: "IMPORT",
          changed_by: admin_id,
          new_data: src
            ? {
                type: src.type,
                description: src.description,
                amount: src.amount,
                used_at: src.used_at,
                notes: src.notes,
              }
            : null,
        };
      });

      await supabase.from("usage_record_audit_logs").insert(auditLogs);
    }

    const inserted = insertedRecords?.length || 0;
    const failed = records.length - inserted;

    const summary = [
      `총 ${records.length}건 중 ${inserted}건 등록 완료`,
      ...(errors.length > 0 ? [`${errors.length}건 오류`] : []),
    ];

    return NextResponse.json({
      success: true,
      inserted,
      failed,
      errors,
      summary,
    });
  } catch (error) {
    console.error("Points usage import error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          failed: 0,
          errors: ["권한이 없습니다."],
          summary: [],
        },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      {
        success: false,
        inserted: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : "서버 오류"],
        summary: [],
      },
      { status: 500 }
    );
  }
}
