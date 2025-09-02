import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface WelfarePointsSummary {
  name: string;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  monthlyUsage: number[]; // 1-12월 사용 금액 배열
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    if (!name) {
      return NextResponse.json({ success: false, error: "이름이 필요합니다." }, { status: 400 });
    }

    const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 통계 시트에서 복지포인트 기본 정보 조회
    // B: 직책, C: 이름, E: 복지포인트 총 금액, G: 복지포인트 잔여 금액, I: 복지포인트 사용금액
    const statsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "통계!B:I", // B: 직책, C: 이름, E: 총금액, G: 잔여금액, I: 사용금액
    });

    const statsRows = statsResponse.data.values;
    let totalAmount = 0;
    let remainingAmountFromStats = 0;
    let usedAmountFromStats = 0;

    if (statsRows && statsRows.length > 1) {
      // 첫 번째 행은 헤더이므로 제외
      const statsDataRows = statsRows.slice(1);

      // 해당 사용자의 통계 데이터 찾기
      const userStatsRow = statsDataRows.find((row) => {
        const rowName = row[1] && row[1].trim(); // C열: 이름
        return rowName === name.trim();
      });

      if (userStatsRow) {
        // E열: 복지포인트 총 금액
        totalAmount = userStatsRow[3] || 0; // E열은 인덱스 3

        // G열: 복지포인트 잔여 금액
        remainingAmountFromStats = userStatsRow[5] || 0; // G열은 인덱스 5

        // I열: 복지포인트 사용 금액
        usedAmountFromStats = userStatsRow[7] || 0; // I열은 인덱스 7
      }
    }

    // 내역 시트에서 복지포인트 사용 내역 조회
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!B:K", // B: 이름, C: 연도, D: 월, E: 일, F: 요일, G: 유형, H: 사용처, I: 금액, J: 확인내용, K: 비고
    });

    const historyRows = historyResponse.data.values;
    let totalUsedAmount = 0;
    const monthlyUsage = Array(12).fill(0);

    if (historyRows && historyRows.length > 1) {
      // 첫 번째 행은 헤더이므로 제외
      const dataRows = historyRows.slice(1);

      // 해당 사용자의 복지포인트 관련 데이터만 필터링
      const userWelfareRows = dataRows.filter((row) => {
        const rowName = row[0] && row[0].trim();
        const rowYear = parseInt(row[1]) || 0;
        const rowType = row[5] || "";

        return rowName === name.trim() && rowYear === parseInt(year) && (rowType.includes("복지포인트") || rowType.includes("복지"));
      });

      // 월별 사용 금액 계산 (1-12월)
      userWelfareRows.forEach((row) => {
        const month = parseInt(row[2]) || 0; // D열: 월
        const amount = row[7] || 0; // I열: 금액

        if (month >= 1 && month <= 12) {
          monthlyUsage[month - 1] += amount;
          totalUsedAmount += amount;
        }
      });
    }

    // 통계 시트 데이터를 우선 사용, 없으면 내역 시트에서 계산한 값 또는 기본값 사용
    if (totalAmount === 0) {
      const monthlyAllowance = 100000; // 월 복지포인트 기본 지급액
      totalAmount = monthlyAllowance * 12;
    }

    // 통계 시트에 사용금액과 잔여금액이 있으면 사용, 없으면 내역에서 계산한 값 사용
    const finalUsedAmount = usedAmountFromStats > 0 ? usedAmountFromStats : totalUsedAmount;
    const finalRemainingAmount = remainingAmountFromStats > 0 ? remainingAmountFromStats : totalAmount - finalUsedAmount;

    const welfarePointsSummary: WelfarePointsSummary = {
      name,
      totalAmount,
      usedAmount: finalUsedAmount,
      remainingAmount: finalRemainingAmount,
      monthlyUsage,
    };

    return NextResponse.json({
      success: true,
      data: welfarePointsSummary,
      message: `${name}의 ${year}년 복지포인트 현황을 조회했습니다.`,
    });
  } catch (error) {
    console.error("복지포인트 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "복지포인트 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
