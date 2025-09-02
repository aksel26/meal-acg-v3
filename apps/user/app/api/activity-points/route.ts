import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface ActivityPointStatistics {
  position: string; // B열: 직책
  name: string; // C열: 이름
  totalAmount: number; // D열: 활동비 총 금액
  remainingAmount: number; // F열: 활동비 잔여 금액
  usedAmount: number; // H열: 활동비 사용금액
  monthlyUsage: number[]; // J~P열: 월별 사용 금액 (1월~12월)
}

export async function GET() {
  try {
    const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "활동비 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 통계 시트 데이터 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "통계!B:P", // B: 직책, C: 이름, D: 활동비 총 금액, F: 활동비 잔여 금액, H: 활동비 사용금액, J~P: 월별 사용 금액
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "활동비 데이터가 없습니다.",
      });
    }

    // 첫 번째 행은 헤더이므로 제외
    const dataRows = rows.slice(1);
    const activityPoints: ActivityPointStatistics[] = dataRows
      .filter((row) => {
        const name = row[1] && row[1].trim();
        const position = row[0] && row[0].trim();

        // 이름이 있고, 직책이 팀장 또는 본부장인 경우만 필터링
        return name !== "" && (position.includes("팀장") || position.includes("본부장"));
      })
      .map((row) => ({
        position: row[0] || "", // B열: 직책
        name: row[1] || "", // C열: 이름
        totalAmount: row[2] || 0, // D열: 활동비 총 금액
        remainingAmount: row[4] || 0, // F열: 활동비 잔여 금액 (E열 건너뛰기)
        usedAmount: row[6] || 0, // H열: 활동비 사용금액 (G열 건너뛰기)
        monthlyUsage: [
          // J~P열: 월별 사용 금액 (1월~6월)
          row[8] || 0, // J열: 1월
          row[9] || 0, // K열: 2월
          row[10] || 0, // L열: 3월
          row[11] || 0, // M열: 4월
          row[12] || 0, // N열: 5월
          row[13] || 0, // O열: 6월
          // 7~12월은 현재 데이터에 없으므로 0으로 채움
          0,
          0,
          0,
          0,
          0,
          0,
        ],
      }));

    return NextResponse.json({
      success: true,
      data: activityPoints,
      message: "활동비 통계 데이터를 조회했습니다.",
    });
  } catch (error) {
    console.error("활동비 데이터 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "활동비 데이터 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
