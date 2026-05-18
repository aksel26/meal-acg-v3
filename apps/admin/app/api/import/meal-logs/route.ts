import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { MealRecord } from "@/lib/excel-parser";

interface ImportRequest {
  memberId: string;
  records: MealRecord[];
  overwrite?: boolean; // true면 기존 데이터 덮어쓰기
}

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { date: string; message: string }[];
}

export async function POST(request: Request): Promise<NextResponse<ImportResult>> {
  try {
    await requireAdminPermission("meal:import");
    const body: ImportRequest = await request.json();
    const { memberId, records, overwrite = false } = body;

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ date: "-", message: "memberId가 필요합니다." }],
        },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ date: "-", message: "레코드가 없습니다." }],
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 멤버 존재 확인
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ date: "-", message: "멤버를 찾을 수 없습니다." }],
        },
        { status: 404 }
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { date: string; message: string }[] = [];

    // 모든 레코드의 날짜에 대해 기존 데이터를 한 번에 조회
    const dates = records.map((r) => r.date);
    const { data: existingLogs } = await supabase
      .from("meal_logs")
      .select("id, entry_date")
      .eq("user_id", memberId)
      .in("entry_date", dates);

    const existingMap = new Map<string, string>();
    existingLogs?.forEach((log) => {
      existingMap.set(log.entry_date, log.id);
    });

    // 삽입/업데이트할 데이터 분리
    const toInsert: typeof records = [];
    const toUpdate: { id: string; data: typeof records[0] }[] = [];

    for (const record of records) {
      const existingId = existingMap.get(record.date);
      if (existingId) {
        if (overwrite) {
          toUpdate.push({ id: existingId, data: record });
        } else {
          skipped++;
        }
      } else {
        toInsert.push(record);
      }
    }

    // 배치 삽입
    if (toInsert.length > 0) {
      const insertData = toInsert.map((record) => ({
        user_id: memberId,
        entry_date: record.date,
        attendance: record.attendance,
        lunch_store: record.lunch_store,
        lunch_amount: record.lunch_amount,
        lunch_payer: record.lunch_payer,
        dinner_store: record.dinner_store,
        dinner_amount: record.dinner_amount,
        dinner_payer: record.dinner_payer,
        breakfast_store: record.breakfast_store,
        breakfast_amount: record.breakfast_amount,
        breakfast_payer: record.breakfast_payer,
      }));

      const { error: insertError } = await supabase.from("meal_logs").insert(insertData);
      if (insertError) {
        errors.push({ date: "-", message: `배치 삽입 오류: ${insertError.message}` });
      } else {
        inserted = toInsert.length;
      }
    }

    // 배치 업데이트 (Supabase는 배치 업데이트를 직접 지원하지 않아 병렬 처리)
    if (toUpdate.length > 0) {
      const updatePromises = toUpdate.map(({ id, data: record }) =>
        supabase
          .from("meal_logs")
          .update({
            attendance: record.attendance,
            lunch_store: record.lunch_store,
            lunch_amount: record.lunch_amount,
            lunch_payer: record.lunch_payer,
            dinner_store: record.dinner_store,
            dinner_amount: record.dinner_amount,
            dinner_payer: record.dinner_payer,
            breakfast_store: record.breakfast_store,
            breakfast_amount: record.breakfast_amount,
            breakfast_payer: record.breakfast_payer,
          })
          .eq("id", id)
          .then(({ error }) => ({ date: record.date, error }))
      );

      const updateResults = await Promise.all(updatePromises);
      for (const result of updateResults) {
        if (result.error) {
          errors.push({ date: result.date, message: result.error.message });
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: inserted > 0 || updated > 0 || skipped > 0,
      inserted,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("Import error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        {
          success: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ date: "-", message: "권한이 없습니다." }],
        },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      {
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [
          {
            date: "-",
            message: error instanceof Error ? error.message : "서버 오류",
          },
        ],
      },
      { status: 500 }
    );
  }
}
