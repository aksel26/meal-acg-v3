import { NextRequest, NextResponse } from "next/server";
// import { initializeGoogleSheets } from "@/lib/google-config";
import { sheets } from "@/lib/google-config";

interface WelfarePointStatistics {
  position: string; // B열: 직책
  name: string; // C열: 이름
  totalAmount: number; // D열: 활동비 총 금액
  remainingAmount: number; // F열: 활동비 잔여 금액
  usedAmount: number; // H열: 활동비 사용금액
  monthlyUsage: number[]; // J~P열: 월별 사용 금액 (1월~12월)
}

export async function GET(request: NextRequest) {
  try {
    // 통계 시트에서는 월별 필터링이 필요 없음 - 전체 데이터 조회

    // const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
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
        message: "복지포인트 데이터가 없습니다.",
      });
    }

    // 첫 번째 행은 헤더이므로 제외
    const dataRows = rows.slice(1);
    const welfarePoints: WelfarePointStatistics[] = dataRows
      .filter((row) => row[1] && row[1].trim() !== "") // 이름이 있는 행만 필터링
      .map((row, index) => ({
        position: row[0] || "", // B열: 직책
        name: row[1] || "", // C열: 이름
        totalAmount: parseInt(row[2]) || 0, // D열: 활동비 총 금액
        remainingAmount: parseInt(row[4]) || 0, // F열: 활동비 잔여 금액 (E열 건너뛰기)
        usedAmount: parseInt(row[6]) || 0, // H열: 활동비 사용금액 (G열 건너뛰기)
        monthlyUsage: [
          // J~P열: 월별 사용 금액 (1월~12월)
          parseInt(row[8]) || 0, // J열: 1월
          parseInt(row[9]) || 0, // K열: 2월
          parseInt(row[10]) || 0, // L열: 3월
          parseInt(row[11]) || 0, // M열: 4월
          parseInt(row[12]) || 0, // N열: 5월
          parseInt(row[13]) || 0, // O열: 6월
        ],
      }));

    return NextResponse.json({
      success: true,
      data: welfarePoints,
      message: "복지포인트 통계 데이터를 조회했습니다.",
    });
  } catch (error) {
    console.error("복지포인트 데이터 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "복지포인트 데이터 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
