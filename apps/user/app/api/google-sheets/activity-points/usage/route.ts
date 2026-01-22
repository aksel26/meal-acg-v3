import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface UsageDetail {
  name: string;           // B열: 직원 이름
  year: number;           // C열: 연도
  month: number;          // D열: 월
  day: number;            // E열: 일
  dayOfWeek: string;      // F열: 요일
  type: string;           // G열: 유형(활동비 또는 복지포인트)
  vendor: string;         // H열: 사용처
  amount: number;         // I열: 금액
  confirmationContent: string; // J열: 확인내용
  notes?: string;         // K열: 비고
  confirmed: boolean;     // J열에 색상이 칠해져 있으면 확인완료
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeName = searchParams.get("employeeName");
    const month = searchParams.get("month");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    if (!employeeName) {
      return NextResponse.json(
        { success: false, error: "직원 이름이 필요합니다." },
        { status: 400 }
      );
    }

    const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json(
        { success: false, error: "Google Sheets 설정이 올바르지 않습니다." },
        { status: 500 }
      );
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." },
        { status: 500 }
      );
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
        message: "사용 내역이 없습니다."
      });
    }

    // 첫 번째 행은 헤더이므로 제외
    const dataRows = rows.slice(1);
    let filteredRows = dataRows.filter(row => row[0] === employeeName); // 직원 이름으로 필터링
    
    // 연도 필터링
    if (year) {
      filteredRows = filteredRows.filter(row => parseInt(row[1]) === parseInt(year));
    }
    
    // 월 필터링 (월이 지정된 경우)
    if (month) {
      filteredRows = filteredRows.filter(row => parseInt(row[2]) === parseInt(month));
    }
    
    const usageDetails: UsageDetail[] = filteredRows
      .map(row => ({
        name: row[0] || "",                    // B열: 직원 이름
        year: parseInt(row[1]) || new Date().getFullYear(), // C열: 연도
        month: parseInt(row[2]) || 1,           // D열: 월
        day: parseInt(row[3]) || 1,             // E열: 일
        dayOfWeek: row[4] || "",                // F열: 요일
        type: row[5] || "",                     // G열: 유형
        vendor: row[6] || "",                   // H열: 사용처
        amount: parseInt(row[7]) || 0,          // I열: 금액
        confirmationContent: row[8] || "",      // J열: 확인내용
        notes: row[9] || "",                    // K열: 비고
        confirmed: false, // TODO: J열의 색상 정보는 별도 API로 처리 필요
      }))
      .sort((a, b) => {
        // 날짜순 정렬 (최신순)
        const dateA = new Date(a.year, a.month - 1, a.day);
        const dateB = new Date(b.year, b.month - 1, b.day);
        return dateB.getTime() - dateA.getTime();
      });

    return NextResponse.json({
      success: true,
      data: usageDetails,
      message: `${employeeName}의 ${year}년${month ? ` ${month}월` : ''} 사용 내역을 조회했습니다.`
    });

  } catch (error) {
    console.error("사용 내역 조회 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "사용 내역 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}