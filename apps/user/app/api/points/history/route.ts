import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface PointsHistory {
  name: string; // B열: 직원 이름
  year: number; // C열: 연도
  month: number; // D열: 월
  day: number; // E열: 일
  dayOfWeek: string; // F열: 요일
  type: string; // G열: 유형(활동비 또는 복지포인트)
  vendor: string; // H열: 사용처
  amount: number; // I열: 금액
  confirmationContent: string; // J열: 확인내용
  notes?: string; // K열: 비고
  confirmed: boolean; // J열에 색상이 칠해져 있으면 확인완료
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const month = searchParams.get("month");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    if (!name) {
      return NextResponse.json({ success: false, error: "이름이 필요합니다." }, { status: 400 });
    }

    if (!month) {
      return NextResponse.json({ success: false, error: "월이 필요합니다." }, { status: 400 });
    }

    const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 내역 시트 데이터 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!B:K", // B: 직원 이름, C: 연도, D: 월, E: 일, F: 요일, G: 유형, H: 사용처, I: 금액, J: 확인내용, K: 비고
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "내역이 없습니다.",
      });
    }

    // 첫 번째 행은 헤더이므로 제외
    const dataRows = rows.slice(1);

    // 이름, 연도, 월로 필터링
    const filteredRows = dataRows.filter((row) => {
      const rowName = row[0] && row[0].trim();
      const rowYear = parseInt(row[1]) || 0;
      const rowMonth = parseInt(row[2]) || 0;

      return rowName === name.trim() && rowYear === parseInt(year) && rowMonth === parseInt(month);
    });

    const pointsHistory: PointsHistory[] = filteredRows
      .map((row) => ({
        name: row[0] || "", // B열: 직원 이름
        year: parseInt(row[1]) || new Date().getFullYear(), // C열: 연도
        month: parseInt(row[2]) || 1, // D열: 월
        day: parseInt(row[3]) || 1, // E열: 일
        dayOfWeek: row[4] || "", // F열: 요일
        type: row[5] || "", // G열: 유형
        vendor: row[6] || "", // H열: 사용처
        amount: row[7] || 0, // I열: 금액
        confirmationContent: row[8] || "", // J열: 확인내용
        notes: row[9] || "", // K열: 비고
        confirmed: false, // TODO: J열의 색상 정보는 별도 API로 처리 필요
      }))
      .sort((a, b) => {
        // 날짜순 정렬 (최신순)
        const dateA = new Date(a.year, a.month - 1, a.day);
        const dateB = new Date(b.year, b.month - 1, b.day);
        return dateB.getTime() - dateA.getTime();
      });

    // 활동비와 복지포인트 분리
    const activityPoints = pointsHistory.filter((item) => item.type.includes("활동비"));
    const welfarePoints = pointsHistory.filter((item) => item.type.includes("복지포인트") || item.type.includes("복지"));

    // 합계 계산
    const totalActivityAmount = activityPoints.reduce((sum, item) => sum + item.amount, 0);
    const totalWelfareAmount = welfarePoints.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        all: pointsHistory,
        activity: activityPoints,
        welfare: welfarePoints,
        summary: {
          totalActivityAmount,
          totalWelfareAmount,
          totalAmount: totalActivityAmount + totalWelfareAmount,
          activityCount: activityPoints.length,
          welfareCount: welfarePoints.length,
          totalCount: pointsHistory.length,
        },
      },
      message: `${name}의 ${year}년 ${month}월 포인트 사용 내역을 조회했습니다.`,
    });
  } catch (error) {
    console.error("포인트 내역 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "포인트 내역 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
