import { NextRequest, NextResponse } from "next/server";
import { sheets } from "@/lib/google-config";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// dayjs 설정
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ko");

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
  no?: number; // A열의 No번호 (수정/삭제시 식별용)
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

    // const sheets = initializeGoogleSheets();
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

      const userStatsRow = statsRows.find((row: any[]) => {
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

    // 2. 내역 시트에서 해당 이름과 월에 해당하는 사용내역 조회 (셀 서식 정보 포함)
    // A: No, B: 직원 이름, C: 연도, D: 월, E: 일, F: 요일, G: 유형, H: 사용처, I: 금액, J: 확인내용, K: 비고
    const historyResponse = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      ranges: ["내역!A:K"],
      includeGridData: true,
    });

    const history: WelfareUsageHistory[] = [];
    let monthlyUsedAmount = "";

    if (historyResponse.data.sheets && historyResponse.data.sheets[0]?.data && historyResponse.data.sheets[0].data[0]?.rowData) {
      const rowData = historyResponse.data.sheets[0].data[0].rowData.slice(1); // 헤더 제외

      // 해당 사용자의 해당 월 복지포인트 내역만 필터링
      rowData.forEach((row: any) => {
        if (!row.values) return;

        const rowName = row.values[1]?.formattedValue?.trim() || ""; // B열: 직원 이름
        const rowYear = parseInt(row.values[2]?.formattedValue || "0") || 0; // C열: 연도
        const rowMonth = parseInt(row.values[3]?.formattedValue || "0") || 0; // D열: 월
        const rowType = row.values[6]?.formattedValue || ""; // G열: 유형

        const isTargetRow = rowName === name.trim() && rowYear === parseInt(year) && rowMonth === parseInt(month);

        if (isTargetRow) {
          const amount = parseInt(row.values[8]?.formattedValue?.replace(/,/g, "") || "0") || 0; // I열: 금액
          monthlyUsedAmount = (parseInt(monthlyUsedAmount.toString().replace(/,/g, "")) + amount).toString();

          // J열 배경색 확인 (흰색 또는 배경 없음: false, 그 외 색상: true)
          const jColumnFormat = row.values[9]?.effectiveFormat;
          const backgroundColor = jColumnFormat?.backgroundColor;

          let hasBackgroundColor = false;
          if (backgroundColor) {
            const red = backgroundColor.red ?? 1;
            const green = backgroundColor.green ?? 1;
            const blue = backgroundColor.blue ?? 1;
            // 흰색(1,1,1) 또는 모든 값이 1에 가까운 경우가 아니면 색상이 있다고 판단
            hasBackgroundColor = !(red >= 0.95 && green >= 0.95 && blue >= 0.95);
          }

          const historyItem: WelfareUsageHistory = {
            no: parseInt(row.values[0]?.formattedValue || "0") || 0, // A열: No번호
            name: rowName, // B열: 직원 이름
            year: rowYear, // C열: 연도
            month: rowMonth, // D열: 월
            day: parseInt(row.values[4]?.formattedValue || "1") || 1, // E열: 일
            dayOfWeek: row.values[5]?.formattedValue || "", // F열: 요일
            type: rowType, // G열: 유형
            vendor: row.values[7]?.formattedValue || "", // H열: 사용처
            amount: amount, // I열: 금액
            confirmationContent: row.values[9]?.formattedValue || "", // J열: 확인내용
            notes: row.values[10]?.formattedValue || "", // K열: 비고
            confirmed: hasBackgroundColor || false, // J열에 색상이 있으면 확인됨
          };

          history.push(historyItem);
        }
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

// POST: 새로운 복지포인트/활동비 내역 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, year, month, day, type, vendor, amount, notes } = body;

    if (!name || !year || !month || !day || !type || !vendor || !amount) {
      return NextResponse.json({ success: false, error: "필수 필드가 누락되었습니다." }, { status: 400 });
    }

    // dayjs로 날짜 처리 (한국 시간대 기준)
    const targetDate = dayjs()
      .year(year)
      .month(month - 1)
      .date(day)
      .tz("Asia/Seoul");

    const koreanDayOfWeek = targetDate.format("dd"); // 월, 화, 수, 목, 금, 토, 일

    // const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. 마지막 No번호 확인하여 새 No 생성
    const lastRowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!A:A",
    });

    let newNo = 1;
    if (lastRowResponse.data.values && lastRowResponse.data.values.length > 1) {
      const lastRow = lastRowResponse.data.values[lastRowResponse.data.values.length - 1];
      const lastNo = parseInt(lastRow?.[0] || "0") || 0;
      newNo = lastNo + 1;
    }

    // 2. 새 행 데이터 준비 (J열만 제외하고 입력)
    const newRow = [
      newNo, // A: No
      name, // B: 직원 이름
      year, // C: 연도
      month, // D: 월
      day, // E: 일
      koreanDayOfWeek, // F: 요일 (한국어)
      type, // G: 유형
      vendor, // H: 사용처
      amount, // I: 금액
      "", // J: 확인내용 (빈값)
      notes || "", // K: 비고
    ];

    // 3. 시트에 새 행 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "내역!A:K",
      valueInputOption: "RAW",
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({
      success: true,
      data: { no: newNo },
      message: "복지포인트/활동비 내역이 추가되었습니다.",
    });
  } catch (error) {
    console.error("복지포인트 추가 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "복지포인트 추가 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// PUT: 기존 복지포인트/활동비 내역 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { no, name, year, month, day, type, vendor, amount, notes } = body;

    if (!no || !name || !year || !month || !day || !type || !vendor || !amount) {
      return NextResponse.json({ success: false, error: "필수 필드가 누락되었습니다." }, { status: 400 });
    }

    // dayjs로 날짜 처리 (한국 시간대 기준)
    const targetDate = dayjs()
      .year(year)
      .month(month - 1)
      .date(day)
      .tz("Asia/Seoul");

    const koreanDayOfWeek = targetDate.format("dd"); // 월, 화, 수, 목, 금, 토, 일

    // const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. No번호로 해당 행 찾기
    const allRowsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!A:K",
    });

    if (!allRowsResponse.data.values) {
      return NextResponse.json({ success: false, error: "데이터를 찾을 수 없습니다." }, { status: 404 });
    }

    const rowIndex = allRowsResponse.data.values.findIndex((row: any[], index: number) => {
      if (index === 0) return false; // 헤더 제외
      return parseInt(row[0]) === no;
    });

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: "해당 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. 수정할 데이터 준비 (J열 확인내용은 기존 값 유지)
    const existingRow = allRowsResponse.data.values[rowIndex];
    const updatedRow = [
      no, // A: No (변경 불가)
      name, // B: 직원 이름
      year, // C: 연도
      month, // D: 월
      day, // E: 일
      koreanDayOfWeek, // F: 요일 (한국어)
      type, // G: 유형
      vendor, // H: 사용처
      amount, // I: 금액
      existingRow?.[9] || "", // J: 확인내용 (기존 값 유지)
      notes || "", // K: 비고
    ];

    // 3. 해당 행 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `내역!A${rowIndex + 1}:K${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({
      success: true,
      message: "복지포인트/활동비 내역이 수정되었습니다.",
    });
  } catch (error) {
    console.error("복지포인트 수정 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "복지포인트 수정 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// DELETE: 복지포인트/활동비 내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const no = searchParams.get("no");

    if (!no) {
      return NextResponse.json({ success: false, error: "No번호가 필요합니다." }, { status: 400 });
    }

    // const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "복지포인트 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. No번호로 해당 행 찾기
    const allRowsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "내역!A:K",
    });

    if (!allRowsResponse.data.values) {
      return NextResponse.json({ success: false, error: "데이터를 찾을 수 없습니다." }, { status: 404 });
    }

    const rowIndex = allRowsResponse.data.values.findIndex((row: any[], index: number) => {
      if (index === 0) return false; // 헤더 제외
      return parseInt(row[0]) === parseInt(no);
    });
    console.log("rowIndex:", rowIndex);

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: "해당 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. 해당 행의 데이터를 비워서 삭제 효과 구현
    const emptyRow = ["", "", "", "", "", "", "", "", "", "", ""]; // A부터 K까지 빈 값

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `내역!A${rowIndex + 1}:K${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [emptyRow],
      },
    });

    return NextResponse.json({
      success: true,
      message: "복지포인트/활동비 내역이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("복지포인트 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "복지포인트 삭제 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
