import { NextRequest, NextResponse } from "next/server";
import { initializeGoogleSheets } from "@/lib/google-config";

interface ActivityPointDetails {
  name: string; // C열: 이름
  personalAmount: number; // E열: 개인 활동비
  teamAmount: number; // F열: 팀 활동비
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ success: false, error: "이름이 필요합니다." }, { status: 400 });
    }

    const sheets = initializeGoogleSheets();
    if (!sheets) {
      return NextResponse.json({ success: false, error: "Google Sheets 설정이 올바르지 않습니다." }, { status: 500 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID_WELFARE_POINTS;
    if (!SHEET_ID) {
      return NextResponse.json({ success: false, error: "활동비 시트 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    // 사용 가이드 시트 데이터 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "사용 가이드!C:F", // C: 이름, D: (건너뛰기), E: 개인 활동비, F: 팀 활동비
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({
        success: false,
        error: "사용 가이드 데이터가 없습니다.",
      });
    }

    // 첫 번째 행은 헤더이므로 제외
    const dataRows = rows.slice(1);

    // 이름과 일치하는 행 찾기
    const matchedRow = dataRows.find((row) => row[0] && row[0].trim() === name.trim());

    if (!matchedRow) {
      return NextResponse.json({
        success: false,
        error: `${name}에 대한 활동비 상세 정보를 찾을 수 없습니다.`,
      });
    }

    const details: ActivityPointDetails = {
      name: matchedRow[0] || "", // C열: 이름
      personalAmount: matchedRow[2] || 0, // E열: 개인 활동비
      teamAmount: matchedRow[3] || 0, // F열: 팀 활동비
    };

    return NextResponse.json({
      success: true,
      data: details,
      message: `${name}의 활동비 상세 정보를 조회했습니다.`,
    });
  } catch (error) {
    console.error("활동비 상세 정보 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "활동비 상세 정보 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
