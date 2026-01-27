import { NextResponse } from "next/server";
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

    // 각 레코드 처리
    for (const record of records) {
      try {
        // 기존 데이터 확인
        const { data: existing } = await supabase
          .from("meal_logs")
          .select("id")
          .eq("user_id", memberId)
          .eq("entry_date", record.date)
          .single();

        const mealLogData = {
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
        };

        if (existing) {
          if (overwrite) {
            // 기존 데이터 업데이트
            const { error: updateError } = await supabase
              .from("meal_logs")
              .update(mealLogData)
              .eq("id", existing.id);

            if (updateError) {
              errors.push({ date: record.date, message: updateError.message });
            } else {
              updated++;
            }
          } else {
            // 건너뛰기
            skipped++;
          }
        } else {
          // 새로 삽입
          const { error: insertError } = await supabase
            .from("meal_logs")
            .insert(mealLogData);

          if (insertError) {
            errors.push({ date: record.date, message: insertError.message });
          } else {
            inserted++;
          }
        }
      } catch (err) {
        errors.push({
          date: record.date,
          message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
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
