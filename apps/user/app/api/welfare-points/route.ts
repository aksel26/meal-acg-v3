import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface ActivityPointsStats {
  position: string;
  name: string;
  totalAmount: string;
  remainingAmount: string;
  usedAmount: string;
}

interface WelfarePointsStats {
  position: string;
  name: string;
  totalAmount: string;
  remainingAmount: string;
  usedAmount: string;
}

interface WelfareUsageHistory {
  name: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  type: string;
  vendor: string;
  amount: number;
  confirmationContent: string;
  notes?: string;
  confirmed: boolean;
}

interface WelfarePointsData {
  activityStats: ActivityPointsStats | null;
  welfareStats: WelfarePointsStats | null;
  history: WelfareUsageHistory[];
  summary: {
    monthlyUsedAmount: string;
    totalAvailableAmount: string;
    remainingAmount: string;
    usageCount: number;
  };
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
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. 통계 시트에서 금액 관련 정보 조회
    // B: 직책, C: 이름, D: 활동비 총금액, F: 활동비 잔여금액, H: 활동비 사용금액
    // E: 복지포인트 총금액, G: 복지포인트 잔여금액, I: 복지포인트 사용금액
    const statsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "통계!B:I",
    });

    let activityStatsData: ActivityPointsStats | null = null;
    let welfareStatsData: WelfarePointsStats | null = null;

    if (statsResponse.data.values && statsResponse.data.values.length > 1) {
      const statsRows = statsResponse.data.values.slice(1); // 헤더 제외

      const userStatsRow = statsRows.find((row) => {
        const rowName = row[1] && row[1].trim(); // C열: 이름
        return rowName === name.trim();
      });

      if (userStatsRow) {
        // 활동비 정보
        activityStatsData = {
          position: userStatsRow[0] || "", // B열: 직책
          name: userStatsRow[1] || "", // C열: 이름
          totalAmount: userStatsRow[2] || 0, // D열: 활동비 총 금액
          remainingAmount: userStatsRow[4] || 0, // F열: 활동비 잔여 금액
          usedAmount: userStatsRow[6] || 0, // H열: 활동비 사용금액
        };

        // 복지포인트 정보
        welfareStatsData = {
          position: userStatsRow[0] || "", // B열: 직책
          name: userStatsRow[1] || "", // C열: 이름
          totalAmount: userStatsRow[3] || 0, // E열: 복지포인트 총 금액
          remainingAmount: userStatsRow[5] || 0, // G열: 복지포인트 잔여 금액
          usedAmount: userStatsRow[7] || 0, // I열: 복지포인트 사용금액
        };
      }
    }

    // 2. 내역 시트에서 해당 이름과 월에 해당하는 사용내역 조회
    // B: 직원 이름, C: 연도, D: 월, E: 일, F: 요일, G: 유형, H: 사용처, I: 금액, J: 확인내용, K: 비고
    const historyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!B:K",
    });

    const history: WelfareUsageHistory[] = [];
    let monthlyUsedAmount = "";

    if (historyResponse.data.values && historyResponse.data.values.length > 1) {
      const historyRows = historyResponse.data.values.slice(1); // 헤더 제외

      // 해당 사용자의 해당 월 복지포인트 내역만 필터링
      const filteredRows = historyRows.filter((row) => {
        const rowName = row[0] && row[0].trim(); // B열: 직원 이름
        const rowYear = parseInt(row[1]) || 0; // C열: 연도
        const rowMonth = parseInt(row[2]) || 0; // D열: 월
        const rowType = row[5] || ""; // G열: 유형

        return rowName === name.trim() && rowYear === parseInt(year) && rowMonth === parseInt(month) && (rowType.includes("복지포인트") || rowType.includes("복지"));
      });

      // 내역 데이터 변환
      filteredRows.forEach((row) => {
        const amount = row[7] || 0; // I열: 금액
        monthlyUsedAmount += amount;

        const historyItem: WelfareUsageHistory = {
          name: row[0] || "", // B열: 직원 이름
          year: parseInt(row[1]) || parseInt(year), // C열: 연도
          month: parseInt(row[2]) || parseInt(month), // D열: 월
          day: parseInt(row[3]) || 1, // E열: 일
          dayOfWeek: row[4] || "", // F열: 요일
          type: row[5] || "", // G열: 유형
          vendor: row[6] || "", // H열: 사용처
          amount: amount, // I열: 금액
          confirmationContent: row[8] || "", // J열: 확인내용
          notes: row[9] || "", // K열: 비고
          confirmed: false, // TODO: J열의 색상 정보로 확인 여부 판단
        };

        history.push(historyItem);
      });
    }

    // 3. 요약 정보 계산
    const totalAvailableAmount = welfareStatsData?.totalAmount || "";
    const remainingAmount = welfareStatsData?.remainingAmount || "";

    const welfarePointsData: WelfarePointsData = {
      activityStats: activityStatsData,
      welfareStats: welfareStatsData,
      history: history.sort((a, b) => {
        // 날짜순 정렬 (최신순)
        const dateA = new Date(a.year, a.month - 1, a.day);
        const dateB = new Date(b.year, b.month - 1, b.day);
        return dateB.getTime() - dateA.getTime();
      }),
      summary: {
        monthlyUsedAmount,
        totalAvailableAmount,
        remainingAmount,
        usageCount: history.length,
      },
    };

    return NextResponse.json({
      success: true,
      data: welfarePointsData,
      message: `${name}의 ${year}년 ${month}월 복지포인트 현황을 조회했습니다.`,
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
